// src/lib/agent/graph.ts

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


// ==========================================
// 2. CONNECTING TO OUR CUSTOM TOOLS (MCP)
// ==========================================
// Here we tell our app how to talk to our custom 'enterprise' server.
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    enterprise: {
      transport: "stdio",
      command: "npx",
      args: ["tsx", "src/mcp-server/server.ts"],
    },
  },
});

export async function createAgentGraph() {
  
  // ==========================================
  // 3. PREPARING THE AI BRAIN
  // ==========================================
  // We grab the tools from our server and give them to the AI so it knows what it can do.
  const mcpTools = await mcpClient.getTools();
  const model = new ChatGroq({ model: "llama-3.3-70b-versatile", temperature: 0 }).bindTools(mcpTools);


  // ==========================================
  // 4. CREATING THE STATIONS (NODES) FOR OUR FLOWCHART
  // ==========================================

  // STATION 1: The Researcher (ragNode)
  // This node reads the user's question, searches the database, and adds the facts to the memory.
  const ragNode = async (state: typeof AgentState.State) => {
    // Get the very last message (the user's question)
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content.toString();
    
    // Search the database for facts related to the question
    const searchResults = await executeHybridSearch(query);
    
    // Format the results so the AI can read them easily
    const contextStr = searchResults
      .map((r, idx) => `[Doc-${idx + 1}] Title: ${r.metadata.title}\nContent: ${r.content}`)
      .join("\n\n");

    // Save the links/titles of the documents we found
    const citations = searchResults.map((r, idx) => ({
      id: `Doc-${idx + 1}`,
      title: r.metadata.title,
      content: r.content,
      uri: r.metadata.uri,
    }));

    // Update the memory box with the citations and a hidden 'system' message containing the facts
    return {
      citations,
      messages: [
        {
          role: "system",
          content: `You possess context retrieved from internal enterprise documents:\n${contextStr}\nWhen using retrieved facts, insert exact inline citation footnotes like [Doc-1].`,
        },
      ],
    };
  };

  // STATION 2: The Thinker (reasoningNode)
  // This node sends the entire memory (conversation + facts) to the AI and gets a response.
  const reasoningNode = async (state: typeof AgentState.State) => {
    // model.invoke sends everything to the AI brain
    const response = await model.invoke(state.messages);
    
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
  // 5. DRAWING THE ARROWS (CONNECTING THE FLOWCHART)
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
      
      // If there was no error (or we retried too many times), just go back to reasoning normally
      return "reasoning";
    });

  // Finally, compile and return our completed flowchart!
  const memory = new MemorySaver();
  return workflow.compile({ checkpointer: memory });
}
