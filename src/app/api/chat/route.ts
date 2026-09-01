// src/app/api/chat/route.ts
//
// This is the bridge between our LangGraph agent and the Next.js frontend.
// It uses the AI SDK v7 UIMessageStream protocol which the useChat() hook
// on the client understands natively.

import { createAgentGraph } from "@/lib/agent/graph";
import { estimateTokenCost, estimateTokenCount, TelemetryMetrics, TelemetryCitation } from "@/lib/agent/pricing";
import { checkRateLimit } from "@/lib/rate-limit";
import { HumanMessage } from "@langchain/core/messages";
import { Command, isGraphInterrupt } from "@langchain/langgraph";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import { saveMessage, generateChatTitle } from "../../chat-actions";

export const maxDuration = 60;

// Chat completions are the core feature — allow 20 requests per minute per IP.
const CHAT_MAX_REQUESTS = 20;

// ── Helper: write an approval notice to the UI stream ────────────────────────
// This writes a text block containing the __APPROVAL_REQUEST__ marker that
// page.tsx detects to show the orange approval modal.
function writeApprovalNotice(
  writer: Parameters<Parameters<typeof createUIMessageStream>[0]['execute']>[0]['writer'],
  sensitiveCall: { name: string; args: Record<string, unknown>; id?: string }
) {
  // We skip emitting native `tool-approval-request` because it requires a preceding `tool-call` event.
  // We handle approval purely through text parsing in the client instead.

  // Visible text block so the modal detector in page.tsx can find it
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
  // ── Rate limiting — checked BEFORE any body parsing ──────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const rl = checkRateLimit(`chat:${ip}`, CHAT_MAX_REQUESTS);

  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded. Please wait before sending more messages.",
        resetAt: rl.resetAt,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(CHAT_MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const url = new URL(req.url);
  const jsonBody = await req.json();
  const { messages } = jsonBody;
  const chatId = url.searchParams.get("chatId") || jsonBody.chatId || jsonBody.body?.chatId;
  const modelId =
    jsonBody.modelId ||
    jsonBody.body?.modelId ||
    jsonBody.model ||
    jsonBody.body?.model ||
    url.searchParams.get("modelId") ||
    url.searchParams.get("model") ||
    "groq-gpt-oss-120b";
  const webSearch =
    jsonBody.webSearch === true ||
    jsonBody.body?.webSearch === true ||
    url.searchParams.get("webSearch") === "true";

  if (!chatId) {
    return new Response(JSON.stringify({ error: "Missing chatId" }), { status: 400 });
  }

  // ── Create our LangGraph agent workflow with dynamic model routing ───────
  let workflow: Awaited<ReturnType<typeof createAgentGraph>>;
  try {
    workflow = await createAgentGraph({ modelId, webSearch });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Failed to create agent graph:", error);
    return new Response(JSON.stringify({ error: errMsg }), { status: 500 });
  }

  // We use the chatId so MemorySaver / PostgresSaver isolates state per chat
  const config = { configurable: { thread_id: chatId }, version: "v2" as const };

  // ── Extract the latest message text ──────────────────────────────────────
  const lastMsg = messages[messages.length - 1];
  const rawText: string =
    typeof lastMsg.content === "string"
      ? lastMsg.content
      : lastMsg.parts?.find((p: { type: string; text?: string }) => p.type === "text")?.text ?? "";
  const text = rawText.replace(/\0/g, "").replace(/\u0000/g, "");

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

  // ── Build the AI SDK v7 UIMessageStream with live telemetry streaming ─────
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const startTime = performance.now();
      let firstTokenTime: number | null = null;
      let promptTokens = estimateTokenCount(text);
      let assistantContent = "";
      let retrievedCitations: TelemetryCitation[] = [];

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

        const ensureTextBlockOpen = () => {
          if (!textBlockId) {
            textBlockId = generateId();
            writer.write({ type: "text-start", id: textBlockId });
          }
        };

        let currentWorkflow = workflow;
        let streamSucceeded = false;
        const autoFallbackModels: SupportedModelId[] = [
          "groq-qwen-3.8-27b",
          "groq-gpt-oss-120b",
        ];

        for (let attempt = 0; attempt <= autoFallbackModels.length; attempt++) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- streamEvents input type is polymorphic
            const eventStream = await currentWorkflow.streamEvents(graphInput as any, config);

            for await (const event of eventStream) {
              // Stream text tokens from the LLM & record Time to First Token (TTFT)
              if (event.event === "on_chat_model_stream" && event.data?.chunk?.content) {
                if (firstTokenTime === null) {
                  firstTokenTime = performance.now();
                }

                const rawContent = event.data.chunk.content;
                let delta = "";
                if (typeof rawContent === "string") {
                  delta = rawContent;
                } else if (Array.isArray(rawContent)) {
                  delta = rawContent
                    .map((p) => (typeof p === "string" ? p : (p as { text?: string })?.text || ""))
                    .join("");
                } else if (rawContent && typeof rawContent === "object") {
                  delta = (rawContent as { text?: string }).text || "";
                }

                if (delta) {
                  assistantContent += delta;
                  ensureTextBlockOpen();
                  writer.write({ type: "text-delta", id: textBlockId!, delta });
                }

                // Update token counts if model reports usage metadata in stream chunks
                const chunkUsage = event.data?.chunk?.usage_metadata;
                if (chunkUsage?.input_tokens) {
                  promptTokens = chunkUsage.input_tokens;
                }
              }

              // Capture structured citations from ragNode
              if (event.event === "on_chain_end" && event.name === "rag" && event.data?.output?.citations) {
                retrievedCitations = event.data.output.citations;
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

            const finalState = await currentWorkflow.getState(config);

            // If streamEvents did not capture text deltas directly (e.g. from multi-cycle tool loopback),
            // recover the assistant text from finalState messages
            if (!assistantContent.trim() && finalState.next.length === 0) {
              const allMessages = (finalState.values?.messages ?? []) as Array<Record<string, unknown>>;
              for (let i = allMessages.length - 1; i >= 0; i--) {
                const msg = allMessages[i];
                const isAi =
                  typeof (msg as { _getType?: () => string })._getType === "function"
                    ? (msg as { _getType: () => string })._getType() === "ai"
                    : msg.role === "assistant";

                const raw = msg.content;
                const text =
                  typeof raw === "string"
                    ? raw
                    : Array.isArray(raw)
                    ? raw.map((p) => (typeof p === "string" ? p : (p as { text?: string })?.text || "")).join("")
                    : "";

                if (isAi && text.trim() && !text.includes("__APPROVAL_REQUEST__")) {
                  assistantContent = text;
                  ensureTextBlockOpen();
                  writer.write({ type: "text-delta", id: textBlockId!, delta: text });
                  break;
                }
              }
            }

            // Close the text block if we opened one
            if (textBlockId) {
              writer.write({ type: "text-end", id: textBlockId });
            }

            const endTime = performance.now();
            const ttftMs = firstTokenTime !== null ? Math.round(firstTokenTime - startTime) : Math.round(endTime - startTime);
            const totalDurationMs = Math.round(endTime - startTime);
            const completionTokens = estimateTokenCount(assistantContent);
            const costEstimate = estimateTokenCost(modelId, promptTokens, completionTokens);

            // If citations were not captured from event stream, fetch from graph state
            if (retrievedCitations.length === 0 && finalState.values?.citations?.length > 0) {
              retrievedCitations = finalState.values.citations;
            }

            // Stream custom telemetry event with latency, token count, estimated cost, and citations
            const telemetryPayload: TelemetryMetrics = {
              modelId,
              ttftMs,
              totalDurationMs,
              tokens: {
                prompt: promptTokens,
                completion: completionTokens,
                total: promptTokens + completionTokens,
              },
              costUsd: costEstimate.totalCost,
              citations: retrievedCitations,
              timestamp: new Date().toISOString(),
            };

            try {
              writer.write({
                type: "data-telemetry",
                data: telemetryPayload,
              });
            } catch (telemetryErr) {
              console.warn("[route] Telemetry event stream write skipped:", telemetryErr);
            }

            if (assistantContent.trim()) {
              try {
                await saveMessage(chatId, "assistant", assistantContent);
              } catch (err) {
                console.error("[route] Warning: Could not save assistant message:", err);
              }
            }

            // ── Check if LangGraph paused at an interrupt (HITL) ─────────────
            console.log("[route] finalState.next:", finalState.next);

            if (finalState.next.length > 0) {
              const allMessages = finalState.values.messages ?? [];
              const lastStateMsg = allMessages[allMessages.length - 1];
              console.log("[route] HITL detected. Last message tool_calls:", lastStateMsg?.tool_calls);

              if (lastStateMsg?.tool_calls?.length > 0) {
                const sensitiveCall = lastStateMsg.tool_calls.find((tc: { name: string }) => tc.name.includes("execute_sql_mutation")) || lastStateMsg.tool_calls[0];
                writeApprovalNotice(writer, sensitiveCall);
              }
            }

            streamSucceeded = true;
            break; // Success — exit fallback loop

          } catch (streamErr: unknown) {
            // ── Handle LangGraph GraphInterrupt (thrown during streamEvents) ──
            if (isGraphInterrupt(streamErr)) {
              console.log("[route] GraphInterrupt caught — triggering HITL approval.");

              if (textBlockId) {
                writer.write({ type: "text-end", id: textBlockId });
              }

              try {
                const pausedState = await currentWorkflow.getState(config);
                const allMessages = pausedState.values.messages ?? [];
                const lastStateMsg = allMessages[allMessages.length - 1];

                if (lastStateMsg?.tool_calls?.length > 0) {
                  const sensitiveCall = lastStateMsg.tool_calls.find((tc: { name: string }) => tc.name.includes("execute_sql_mutation")) || lastStateMsg.tool_calls[0];
                  writeApprovalNotice(writer, sensitiveCall);
                } else {
                  writeApprovalNotice(writer, {
                    name: "sensitive_operation",
                    args: {},
                  });
                }
              } catch (stateErr) {
                console.error("[route] Could not read paused state:", stateErr);
                writeApprovalNotice(writer, { name: "sensitive_operation", args: {} });
              }
              streamSucceeded = true;
              break;
            }

            // ── Check for Rate Limits (429) to trigger transparent failover ──
            const errString = String(streamErr);
            const isRateLimit =
              (streamErr as { status?: number })?.status === 429 ||
              errString.includes("429") ||
              errString.includes("rate_limit") ||
              errString.includes("Rate limit") ||
              errString.includes("tokens per day") ||
              errString.includes("RateLimitQuotaExhaustedError");

            if (isRateLimit && attempt < autoFallbackModels.length) {
              const nextFallback = autoFallbackModels[attempt];
              console.warn(`[route] 429 Quota exhausted on current model. Auto-failing over to ${nextFallback}...`);
              // Reset text buffer and instantiate fallback graph
              assistantContent = "";
              if (textBlockId) {
                writer.write({ type: "text-end", id: textBlockId });
                textBlockId = null;
              }
              currentWorkflow = await createAgentGraph({ modelId: nextFallback, webSearch });
              continue;
            }

            // If not rate limit or fallbacks exhausted, rethrow
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

  return createUIMessageStreamResponse({
    stream,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
