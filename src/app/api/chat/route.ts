// src/app/api/chat/route.ts
//
// This is the bridge between our LangGraph agent and the Next.js frontend.
// It uses the AI SDK v7 UIMessageStream protocol which the useChat() hook
// on the client understands natively.

import { createAgentGraph } from "@/lib/agent/graph";
import { HumanMessage } from "@langchain/core/messages";
import { Command, isGraphInterrupt } from "@langchain/langgraph";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import { saveMessage, generateChatTitle } from "../../chat-actions";

export const maxDuration = 60;

// ── Helper: write an approval notice to the UI stream ────────────────────────
// This writes a text block containing the __APPROVAL_REQUEST__ marker that
// page.tsx detects to show the orange approval modal.
function writeApprovalNotice(
  writer: Parameters<Parameters<typeof createUIMessageStream>[0]['execute']>[0]['writer'],
  sensitiveCall: { name: string; args: Record<string, unknown>; id?: string }
) {
  const approvalId = generateId();

  // We skip emitting native `tool-approval-request` because it requires a preceding `tool-call` event.
  // We handle approval purely through text parsing in the client instead.

  // 2. A visible text block so the modal detector in page.tsx can find it
  const noticeId = generateId();
  writer.write({ type: "text-start", id: noticeId });
  writer.write({
    type: "text-delta",
    id: noticeId,
    delta: `__APPROVAL_REQUEST__\nTool: ${sensitiveCall.name}\nArgs: ${JSON.stringify(sensitiveCall.args, null, 2)}`,
  });
  writer.write({ type: "text-end", id: noticeId });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const jsonBody = await req.json();
  const { messages } = jsonBody;
  const chatId = url.searchParams.get("chatId") || jsonBody.chatId || jsonBody.body?.chatId;

  if (!chatId) {
    return new Response(JSON.stringify({ error: "Missing chatId" }), { status: 400 });
  }

  // ── Create our LangGraph agent workflow ───────────────────────────────────
  let workflow: Awaited<ReturnType<typeof createAgentGraph>>;
  try {
    workflow = await createAgentGraph();
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to create agent graph:", error);
    return new Response(JSON.stringify({ error: errMsg }), { status: 500 });
  }

  // We use the chatId so MemorySaver isolates state per chat
  const config = { configurable: { thread_id: chatId }, version: "v2" as const };

  // ── Extract the latest message text ──────────────────────────────────────
  const lastMsg = messages[messages.length - 1];
  const text: string =
    typeof lastMsg.content === "string"
      ? lastMsg.content
      : lastMsg.parts?.find((p: { type: string; text?: string }) => p.type === "text")?.text ?? "";

  // ── Save user message and trigger auto-naming ────────────────────────────
  if (text !== "[HUMAN_APPROVAL_YES]" && text !== "[HUMAN_APPROVAL_NO]") {
    try {
      await saveMessage(chatId, "user", text);
      
      // Auto-name chat if it's the first message
      if (messages.length <= 2) {
         generateChatTitle(chatId, text).catch(console.error);
      }
    } catch (saveErr) {
      console.error("[route] Warning: Could not save message or title:", saveErr);
    }
  }

  // ── Build the AI SDK v7 UIMessageStream ───────────────────────────────────
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      try {
        // ── Determine what to send to LangGraph ────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Command resume types don't narrow cleanly with graph input types
        let graphInput: { messages: HumanMessage[] } | InstanceType<typeof Command>;
        if (text === "[HUMAN_APPROVAL_YES]") {
          graphInput = new Command({ resume: { approved: true } });
        } else if (text === "[HUMAN_APPROVAL_NO]") {
          graphInput = new Command({ resume: { approved: false } });
        } else {
          graphInput = { messages: [new HumanMessage(text)] };
        }

        // ── Run the LangGraph pipeline ─────────────────────────────────────
        // We open the text block LAZILY — only when real text tokens arrive.
        // Tool-call-only responses (like HITL triggers) produce no text, so
        // we must not emit an empty text block that would confuse the detector.
        let textBlockId: string | null = null;
        let assistantContent = "";

        const ensureTextBlockOpen = () => {
          if (!textBlockId) {
            textBlockId = generateId();
            writer.write({ type: "text-start", id: textBlockId });
          }
        };

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- streamEvents input type is polymorphic
          const eventStream = await workflow.streamEvents(graphInput as any, config);

          for await (const event of eventStream) {
            // Stream text tokens from the LLM
            if (event.event === "on_chat_model_stream" && event.data?.chunk?.content) {
              const delta = typeof event.data.chunk.content === "string"
                ? event.data.chunk.content
                : String(event.data.chunk.content);
              if (delta) {
                assistantContent += delta;
                ensureTextBlockOpen();
                writer.write({ type: "text-delta", id: textBlockId!, delta });
              }
            }

            // Signal tool start to the frontend
            if (event.event === "on_tool_start") {
              writer.write({
                type: "tool-input-available",
                toolCallId: event.run_id,
                toolName: event.name,
                input: event.data?.input ?? {},
              });
            }

            // Signal tool completion to the frontend
            if (event.event === "on_tool_end") {
              const output = event.data?.output;
              writer.write({
                type: "tool-output-available",
                toolCallId: event.run_id,
                output: typeof output === "string" ? output : JSON.stringify(output),
              });
            }
          }

          // Close the text block if we opened one
          if (textBlockId) {
            writer.write({ type: "text-end", id: textBlockId });
          }

          if (assistantContent.trim()) {
            try {
              await saveMessage(chatId, "assistant", assistantContent);
            } catch (err) {
              console.error("[route] Warning: Could not save assistant message:", err);
            }
          }

          // ── Check if LangGraph paused at an interrupt (HITL) ─────────────
          // After the stream ends normally (no exception), check if the graph
          // is waiting at an interrupt node.
          const finalState = await workflow.getState(config);
          console.log("[route] finalState.next:", finalState.next);

          if (finalState.next.length > 0) {
            const allMessages = finalState.values.messages ?? [];
            const lastStateMsg = allMessages[allMessages.length - 1];
            console.log("[route] HITL detected. Last message tool_calls:", lastStateMsg?.tool_calls);

            if (lastStateMsg?.tool_calls?.length > 0) {
              writeApprovalNotice(writer, lastStateMsg.tool_calls[0]);
            }
          }

        } catch (streamErr: unknown) {
          // ── Handle LangGraph GraphInterrupt (thrown during streamEvents) ──
          // interrupt() in approvalNode throws GraphInterrupt which propagates
          // through streamEvents. We catch it here and convert it to an approval
          // notice instead of an error.
          if (isGraphInterrupt(streamErr)) {
            console.log("[route] GraphInterrupt caught — triggering HITL approval.");

            // Close any open text block before writing the approval
            if (textBlockId) {
              writer.write({ type: "text-end", id: textBlockId });
            }

            // Get the paused state to find the pending tool call
            try {
              const pausedState = await workflow.getState(config);
              console.log("[route] Paused state next:", pausedState.next);
              const allMessages = pausedState.values.messages ?? [];
              const lastStateMsg = allMessages[allMessages.length - 1];

              if (lastStateMsg?.tool_calls?.length > 0) {
                writeApprovalNotice(writer, lastStateMsg.tool_calls[0]);
              } else {
                // Interrupt without a specific tool call — show generic notice
                writeApprovalNotice(writer, {
                  name: "sensitive_operation",
                  args: {},
                });
              }
            } catch (stateErr) {
              console.error("[route] Could not read paused state:", stateErr);
              writeApprovalNotice(writer, { name: "sensitive_operation", args: {} });
            }
          } else {
            // Re-throw non-interrupt errors to be caught by the outer catch
            throw streamErr;
          }
        }

      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[route] Fatal streaming error:", err);
        // Write the error as visible text so the user sees what happened
        const errId = generateId();
        writer.write({ type: "text-start", id: errId });
        writer.write({
          type: "text-delta",
          id: errId,
          delta: `⚠️ Error: ${errMsg}`,
        });
        writer.write({ type: "text-end", id: errId });
      }
    },

    onError: (err) => {
      console.error("[route] UIMessageStream onError:", err);
      return err instanceof Error ? err.message : "An unexpected error occurred.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
