// src/lib/agent/graph.ts
import { SystemMessage } from "@langchain/core/messages";

// ==========================================
// 1. IMPORTING OUR TOOLS
// ==========================================

// StateGraph: Helps us build the flowchart. START and END are the beginning and end.
// interrupt: A special function that pauses the app to ask a human for permission.
import { StateGraph, END, START, interrupt, MemorySaver } from "@langchain/langgraph";

// ChatGroq: The actual AI brain we will use.
import { ChatGroq } from "@langchain/groq";

// MultiServerMCPClient: A tool that lets our AI connect to external databases or APIs.
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

// AIMessage: A specific type of message that comes from the AI.
import { AIMessage } from "@langchain/core/messages";

// AgentState: The memory box we created earlier to hold our data.
import { AgentState } from "./state";

// executeHybridSearch: A function we created to search our database for documents.
import { executeHybridSearch } from "../db/hybrid-search";

// ✅ Module-level singleton — persists across HTTP requests so paused HITL
// checkpoints are not lost between the initial request and the resume request.
const memory = new MemorySaver();

// ==========================================
// 2. HELPER: Race a promise against a timeout
// ==========================================
// On Windows, spawning `npx tsx` via stdio can take 5-15 seconds.
// This helper lets us give up and fall back to "no tools" mode gracefully
// rather than hanging the entire HTTP request forever.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function createAgentGraph() {

  // ==========================================
  // 3. CONNECTING TO OUR CUSTOM TOOLS (MCP)
  // ==========================================
  // We create the MCP client INSIDE this function so each graph instance
  // gets a fresh client. We wrap getTools() in a timeout so Windows stdio
  // subprocess startup delays don't hang the request forever.
  let mcpTools: any[] = [];
  try {
    const mcpClient = new MultiServerMCPClient({
      mcpServers: {
        enterprise: {
          transport: "stdio",
          command: "npx",
          args: ["tsx", "src/mcp-server/server.ts"],
        },
      },
    });

    // Give the MCP subprocess max 8 seconds to start up and return tools.
    // If it times out, we fall back to an empty tool list and the AI still
    // answers using its RAG context — it just won't be able to call DB tools.
    mcpTools = await withTimeout(mcpClient.getTools(), 8000, []);

    if (mcpTools.length === 0) {
      console.warn("⚠️  MCP tools timed out or returned empty — running without tools.");
    } else {
      console.log(`✅ MCP loaded ${mcpTools.length} tool(s).`);
    }
  } catch (err) {
    console.error("❌ MCP client failed to initialize:", err);
    mcpTools = [];
  }

  // ==========================================
  // 4. PREPARING THE AI BRAIN
  // ==========================================
  // We give the model the list of MCP tools so it knows what actions it can take.
  const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
  }).bindTools(mcpTools);


  // ==========================================
  // 5. CREATING THE STATIONS (NODES) FOR OUR FLOWCHART
  // ==========================================

  // STATION 1: The Researcher (ragNode)
  // This node searches the knowledge base and stores results in state.citations.
  // It does NOT add messages to state — that would pollute the message order.
  const ragNode = async (state: typeof AgentState.State) => {
    // Get the very last message (the user's question)
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content.toString();

    // Search the database for facts related to the question
    const searchResults = await executeHybridSearch(query);

    // Save the links/titles of the documents we found (stored in state.citations)
    const citations = searchResults.map((r, idx) => ({
      id: `Doc-${idx + 1}`,
      title: r.metadata.title,
      content: r.content,
      uri: r.metadata.uri,
    }));

    // ✅ Only update citations — NO messages added here
    return { citations };
  };

  // STATION 2: The Thinker (reasoningNode)
  // Builds the full message list fresh every call, guaranteeing correct order:
  // [SystemMessage(RAG context)] + [conversation history]
  const reasoningNode = async (state: typeof AgentState.State) => {
    // Build the RAG context string from the citations we stored in state
    const contextStr = state.citations.length > 0
      ? state.citations
          .map((c) => `[${c.id}] Title: ${c.title}\nContent: ${c.content}`)
          .join("\n\n")
      : "No specific documents were retrieved for this query.";

    // ✅ Always put the system prompt FIRST — this is what Groq/Llama requires.
    // We build this fresh every time instead of relying on state message ordering.
    const systemPrompt = new SystemMessage(
      `You are a helpful enterprise knowledge assistant.\n\n` +
      `Retrieved context from internal documents:\n${contextStr}\n\n` +
      `When using retrieved facts, insert exact inline citation footnotes like [Doc-1].\n\n` +
      `CRITICAL INSTRUCTION: If the user asks you to "execute a database mutation" or "do sql mutations" but does not provide a specific query, you MUST generate a safe dummy query (e.g. "DELETE FROM test_table") and call the enterprise_execute_sql_mutation tool immediately to demonstrate the functionality.`
    );

    // Only include human and AI messages (no system messages from state)
    const conversationHistory = state.messages.filter((m: any) => {
      const type = typeof m._getType === "function" ? m._getType() : (m.role ?? "");
      return type !== "system";
    });

    // Build the final ordered message list: system first, then conversation
    const orderedMessages = [systemPrompt, ...conversationHistory];

    // Invoke the model with the clean, ordered message list
    const response = await model.invoke(orderedMessages);

    // Add the AI's response to the memory box
    return { messages: [response] };
  };

  // STATION 3: The Bouncer (approvalNode)
  // This node checks if the AI wants to do something dangerous (like changing the database).
  const approvalNode = async (state: typeof AgentState.State) => {
    // Get the AI's last message to see what it wants to do
    const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMsg.tool_calls || [];

    // Look for a specific tool call named "execute_sql_mutation" (which is dangerous)
    const sensitiveCall = toolCalls.find((tc: any) => tc.name.includes("execute_sql_mutation"));

    // If it found a dangerous call, and a human hasn't approved it yet...
    if (sensitiveCall && !state.isApproved) {
      // PAUSE THE APP! Ask the human for permission.
      const decision = interrupt({
        type: "HUMAN_APPROVAL_REQUEST",
        toolCall: sensitiveCall,
      });

      // If the human says "NO" (rejected), cancel the tool execution.
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

    // On approval (or if no sensitive call), return empty state update so LangGraph proceeds
    return {};
  };

  // STATION 4: The Worker (toolExecutionNode)
  // This node actually runs the tool the AI asked for (e.g., getting data from the database).
  const toolExecutionNode = async (state: typeof AgentState.State) => {
    const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMsg.tool_calls || [];
    const results = [];

    // Loop through every tool the AI asked to use
    for (const call of toolCalls) {
      try {
        // Find the right tool and run it
        const targetTool = mcpTools.find((t) => t.name === call.name);
        if (!targetTool) throw new Error(`Tool ${call.name} not available.`);

        const output = await targetTool.invoke(call.args);

        // Save the successful result to the memory box
        results.push({
          role: "tool",
          tool_call_id: call.id,
          content: typeof output === "string" ? output : JSON.stringify(output),
        });
      } catch (err: any) {
        // ERROR HANDLING (Self-Correction setup)
        // If the tool crashes, DON'T crash the app. Instead, save the error message
        // to the memory so the AI can read it and try to fix it!
        results.push({
          role: "tool",
          tool_call_id: call.id,
          content: `RUNTIME EXCEPTION: ${err.message}`,
          isError: true,
        });
      }
    }
    // Return all tool results (or errors) back into the memory box
    return { messages: results };
  };

  // ==========================================
  // 6. DRAWING THE ARROWS (CONNECTING THE FLOWCHART)
  // ==========================================
  const workflow = new StateGraph(AgentState)
    // First, register all the stations we just built
    .addNode("rag", ragNode)
    .addNode("reasoning", reasoningNode)
    .addNode("approval", approvalNode)
    .addNode("tools", toolExecutionNode)

    // Draw the main arrows: START -> rag -> reasoning
    .addEdge(START, "rag")
    .addEdge("rag", "reasoning")

    // Rule for what happens AFTER reasoning:
    .addConditionalEdges("reasoning", (state) => {
      const lastMsg = state.messages[state.messages.length - 1] as AIMessage;
      // If the AI asked to use a tool, go to the 'approval' station next
      if (lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
        return "approval";
      }
      // Otherwise, the AI just gave a regular answer, so we are finished (END)
      return END;
    })

    // Arrow: approval -> tools
    .addEdge("approval", "tools")

    // Rule for what happens AFTER tools finish running:
    .addConditionalEdges("tools", (state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      // Check if the tool crashed and gave us an error
      const isErr = lastMsg.content?.toString().includes("RUNTIME EXCEPTION");

      // If there was an error, loop BACK to the 'reasoning' station so the AI can fix it!
      if (isErr && state.retryCount < 3) {
        return "reasoning"; // Self-correction loop
      }

      // If there was no error (or we retried too many times), go back to reasoning
      return "reasoning";
    });

  // Finally, compile and return our completed flowchart!
  // (memory is the module-level MemorySaver singleton defined at the top of this file)
  return workflow.compile({ checkpointer: memory });
}
