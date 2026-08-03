import { createAgentGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

export const maxDuration = 60;

export async function POST(req: Request) {
  // `data` will contain our custom action if the user clicked Approve/Reject
  const { messages, data } = await req.json();

  let workflow;
  try {
    workflow = await createAgentGraph();
  } catch (error: any) {
    console.error("Failed to create agent graph:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  
  // We use a constant thread ID for this session so MemorySaver can persist the state
  const config = { configurable: { thread_id: "default-thread" }, version: "v2" as const };

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    try {
      let eventStream;
      
      const lastMsg = messages[messages.length - 1];
      const text = lastMsg.content || (lastMsg.parts && lastMsg.parts[0]?.text) || "";
      
      // Check if this request is a resume action from the Approval Modal (via Magic String)
      if (text === "[HUMAN_APPROVAL_YES]") {
        eventStream = await workflow.streamEvents(
          new Command({ resume: { approved: true } }),
          config
        );
      } else if (text === "[HUMAN_APPROVAL_NO]") {
        eventStream = await workflow.streamEvents(
          new Command({ resume: { approved: false } }),
          config
        );
      } else {
        // Normal chat message
        eventStream = await workflow.streamEvents(
          { messages: [new HumanMessage(text)] }, 
          config
        );
      }
      
      // Loop through every single event the AI generates
      for await (const event of eventStream) {
        
        // 1. Stream Text Chunks
        if (event.event === "on_chat_model_stream" && event.data.chunk.content) {
          const textChunk = event.data.chunk.content;
          await writer.write(encoder.encode(`0:${JSON.stringify(textChunk)}\n`));
        }
        
        // 2. Stream Tool Start (Format: `9:`)
        if (event.event === "on_tool_start") {
          const toolCall = {
            toolCallId: event.run_id,
            toolName: event.name,
            args: event.data.input,
          };
          await writer.write(encoder.encode(`9:[${JSON.stringify(toolCall)}]\n`));
        }
        
        // 3. Stream Tool End (Format: `a:`)
        if (event.event === "on_tool_end") {
          const toolResult = {
            toolCallId: event.run_id,
            result: event.data.output,
          };
          await writer.write(encoder.encode(`a:[${JSON.stringify(toolResult)}]\n`));
        }
      }
      
      // 4. Check if the graph paused for Human Approval!
      const finalState = await workflow.getState(config);
      if (finalState.next.length > 0) {
        // The graph is paused. Find the tool call that triggered the pause.
        const allMessages = finalState.values.messages;
        const lastMsg = allMessages[allMessages.length - 1];
        
        if (lastMsg && lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
           const sensitiveCall = lastMsg.tool_calls[0];
           
           // We use a magic string in a standard text chunk to trigger the modal safely
           await writer.write(encoder.encode(`0:" "\n`));
           await writer.write(encoder.encode(`0:"[APPROVAL_REQUEST]${JSON.stringify(sensitiveCall).replace(/"/g, '\\"')}"\n`));
        }
      }

    } catch (err: any) {
      console.error("Error during AI streaming:", err);
      await writer.write(encoder.encode(`3:${JSON.stringify(err.message)}\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}
