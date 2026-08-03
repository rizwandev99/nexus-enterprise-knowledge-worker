import { createAgentGraph } from "@/lib/agent/graph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

// Tell Next.js to let this function run for up to 60 seconds 
// (AI can sometimes take a while to think, especially with tools)
export const maxDuration = 60;

export async function POST(req: Request) {
  // 1. Get the chat messages sent from the frontend website
  const { messages } = await req.json();

  // 2. TRANSLATION: Convert simple website messages into LangChain Message Objects
  const langchainMessages = messages.map((m: any) => 
    m.role === "user" 
      ? new HumanMessage(m.content) 
      : new AIMessage(m.content)
  );

  // 3. Wake up our AI flowchart (LangGraph)
  const workflow = await createAgentGraph();

  // 4. Set up a "pipe" (stream) to send data back to the user piece-by-piece
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // 5. Start the AI process in the background
  (async () => {
    try {
      // Start streaming events from our flowchart
      const eventStream = await workflow.streamEvents(
        { messages: langchainMessages }, 
        { version: "v2" }
      );
      
      // Loop through every single event the AI generates
      for await (const event of eventStream) {
        // We only care about the event where the AI is streaming a text chunk to us
        if (event.event === "on_chat_model_stream" && event.data.chunk.content) {
          
          const textChunk = event.data.chunk.content;
          
          // TRANSLATION: The Vercel AI SDK expects streaming text to look exactly like this: 0:"hello"\n
          const formattedChunk = `0:${JSON.stringify(textChunk)}\n`;
          
          // Send this tiny piece of text down the pipe to the user
          await writer.write(encoder.encode(formattedChunk));
        }
      }
    } catch (err) {
      console.error("Error during AI streaming:", err);
    } finally {
      // Always close the pipe when we are done so the webpage knows the AI is finished!
      await writer.close();
    }
  })();

  // 6. Return the readable side of the pipe back to the browser
  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1", // Tell the Vercel AI UI to expect this special stream format
    },
  });
}
