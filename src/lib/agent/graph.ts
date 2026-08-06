// src/lib/agent/graph.ts
import { SystemMessage, AIMessage, BaseMessage, ToolCall } from "@langchain/core/messages";
import { StateGraph, END, START, interrupt } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatGroq } from "@langchain/groq";
import { AgentState } from "./state";
import { executeHybridSearch } from "../db/hybrid-search";
import { nativeTools } from "./tools";
import { pool } from "../db/prisma";

// ✅ Module-level singleton — persists across HTTP requests so paused HITL
// checkpoints are not lost between the initial request and the resume request.
const checkpointer = new PostgresSaver(pool);
let checkpointerInitialized = false;

export async function createAgentGraph() {
  if (!checkpointerInitialized) {
    await checkpointer.setup();
    checkpointerInitialized = true;
  }

  // ==========================================
  // 1. PREPARING THE AI BRAIN WITH NATIVE TOOLS
  // ==========================================
  const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
  }).bindTools(nativeTools);

  // ==========================================
  // 2. CREATING THE STATIONS (NODES) FOR OUR FLOWCHART
  // ==========================================

  // STATION 1: The Researcher (ragNode)
  const ragNode = async (state: typeof AgentState.State) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content.toString();

    const searchResults = await executeHybridSearch(query);

    const citations = searchResults.map((r, idx) => ({
      id: `Doc-${idx + 1}`,
      title: r.metadata.title,
      content: `(Database ID: ${r.metadata.id})\n${r.content}`,
      uri: r.metadata.uri,
    }));

    return { citations };
  };

  // STATION 2: The Thinker (reasoningNode)
  const reasoningNode = async (state: typeof AgentState.State) => {
    const contextStr =
      state.citations.length > 0
        ? state.citations
            .map((c) => `[${c.id}] Title: ${c.title}\nContent: ${c.content}`)
            .join("\n\n")
        : "No specific documents were retrieved for this query.";

    const systemPrompt = new SystemMessage(
      `You are a helpful enterprise knowledge assistant.\n\n` +
        `Retrieved context from internal documents:\n${contextStr}\n\n` +
        `When using retrieved facts, insert exact inline citation footnotes like [Doc-1].\n\n` +
        `DATABASE SCHEMA: You have access to a PostgreSQL database. The main table is 'documents' with columns: id (UUID), title (Text), content (Text).\n` +
        `When a user asks to delete, update, or modify a document, you MUST formulate the correct SQL query using the 'documents' table and the document's ID.\n\n` +
        `CRITICAL INSTRUCTION: If the user asks you to "execute a database mutation" or "do sql mutations" but does not provide a specific query or target, you MUST generate a safe dummy query (e.g. "DELETE FROM test_table") and call the execute_sql_mutation tool immediately to demonstrate the functionality.\n` +
        `If the SQL mutation fails, simply inform the user of the exact database error. DO NOT refuse to execute SQL mutations.`
    );

    const conversationHistory = state.messages.filter((m: BaseMessage) => {
      const type = typeof m._getType === "function" ? m._getType() : "";
      return type !== "system";
    });

    const orderedMessages = [systemPrompt, ...conversationHistory];
    const response = await model.invoke(orderedMessages);

    return { messages: [response] };
  };

  // STATION 3: The Bouncer (approvalNode)
  const approvalNode = async (state: typeof AgentState.State) => {
    const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMsg.tool_calls || [];

    const sensitiveCall = toolCalls.find((tc: ToolCall) =>
      tc.name.includes("execute_sql_mutation")
    );

    if (sensitiveCall && !state.isApproved) {
      const decision = interrupt({
        type: "HUMAN_APPROVAL_REQUEST",
        toolCall: sensitiveCall,
      });

      if (!decision.approved) {
        return {
          messages: [
            {
              role: "tool",
              tool_call_id: sensitiveCall.id,
              content: "Tool execution aborted by human approval rejection.",
            },
          ],
        };
      }
    }

    return {};
  };

  // STATION 4: The Worker (toolExecutionNode)
  const toolExecutionNode = async (state: typeof AgentState.State) => {
    const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMsg.tool_calls || [];
    const results = [];

    for (const call of toolCalls) {
      try {
        const targetTool = nativeTools.find((t) => t.name === call.name);
        if (!targetTool) throw new Error(`Tool ${call.name} not available.`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const output = await (targetTool as { invoke: (args: Record<string, unknown>) => Promise<string> }).invoke(call.args);

        results.push({
          role: "tool",
          tool_call_id: call.id,
          content: typeof output === "string" ? output : JSON.stringify(output),
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({
          role: "tool",
          tool_call_id: call.id,
          content: `RUNTIME EXCEPTION: ${errMsg}`,
          isError: true,
        });
      }
    }
    return { messages: results };
  };

  // ==========================================
  // 3. DRAWING THE ARROWS (CONNECTING THE FLOWCHART)
  // ==========================================
  const workflow = new StateGraph(AgentState)
    .addNode("rag", ragNode)
    .addNode("reasoning", reasoningNode)
    .addNode("approval", approvalNode)
    .addNode("tools", toolExecutionNode)

    .addEdge(START, "rag")
    .addEdge("rag", "reasoning")

    .addConditionalEdges("reasoning", (state) => {
      const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
      if (lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
        return "approval";
      }
      return END;
    })

    .addEdge("approval", "tools")

    .addConditionalEdges("tools", (state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      const isErr = lastMsg.content?.toString().includes("RUNTIME EXCEPTION");

      if (isErr && state.retryCount < 3) {
        return "reasoning"; // Self-correction loop
      }

      return "reasoning";
    });

  return workflow.compile({ checkpointer });
}
