"use client";

import type { UIMessage } from "@ai-sdk/react";

interface MessageBubbleProps {
  message: UIMessage;
  isUser: boolean;
}

interface TextPart {
  type: "text";
  text: string;
}

interface ToolInvocationPart {
  type: "tool-invocation";
  toolInvocation: {
    toolName: string;
    state: "call" | "result";
    [key: string]: unknown;
  };
}

type MessagePart = TextPart | ToolInvocationPart;

export default function MessageBubble({ message, isUser }: MessageBubbleProps) {
  const parts = message.parts as MessagePart[] | undefined;

  const partsText = Array.isArray(parts)
    ? (parts as MessagePart[])
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => p.text)
        .join("")
    : "";

  if (
    partsText === "[HUMAN_APPROVAL_YES]" ||
    partsText === "[HUMAN_APPROVAL_NO]" ||
    partsText.includes("__APPROVAL_REQUEST__")
  ) {
    return null;
  }

  const hasContent =
    partsText.trim() ||
    (Array.isArray(parts) && parts.some((p) => p.type === "tool-invocation"));
  if (!hasContent) return null;

  return (
    <div className={`flex msg-animate ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar for AI */}
      {!isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-lg mr-3 flex items-center justify-center text-xs font-bold mt-1 self-start"
          style={{
            background: "linear-gradient(135deg, #6366f1, #a78bfa)",
            color: "#fff",
            boxShadow: "0 0 12px var(--color-brand-glow)",
          }}
          aria-hidden="true"
        >
          N
        </div>
      )}

      <div
        className={`max-w-[78%] rounded-2xl ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        style={
          isUser
            ? {
                background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
                color: "#fff",
                padding: "12px 18px",
                boxShadow: "0 4px 20px var(--color-brand-glow)",
              }
            : {
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
                padding: "14px 18px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.35)",
              }
        }
      >
        {/* Role badge */}
        <div
          className="text-[10px] font-semibold uppercase tracking-widest mb-2 font-mono"
          style={{
            color: isUser ? "rgba(255,255,255,0.55)" : "var(--color-brand-hover)",
            letterSpacing: "0.12em",
          }}
        >
          {isUser ? "You" : "Nexus AI"}
        </div>

        {/* Content */}
        <div className={`text-sm leading-relaxed whitespace-pre-wrap prose-dark`}>
          {Array.isArray(parts) && parts.length > 0 ? (
            parts.map((part, index) => {
              if (part.type === "text") return <span key={index}>{part.text}</span>;

              if (part.type === "tool-invocation") {
                const isDone = part.toolInvocation.state === "result";
                return (
                  <div
                    key={index}
                    className="my-3 flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{
                      background: isDone ? "var(--color-success-muted)" : "var(--color-surface-3)",
                      border: `1px solid ${isDone ? "rgba(52,211,153,0.2)" : "var(--color-border)"}`,
                    }}
                  >
                    {isDone ? (
                      <span style={{ color: "var(--color-success)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : (
                      <div
                        className="w-3 h-3 rounded-full border-[1.5px] border-t-transparent animate-spin"
                        style={{ borderColor: "var(--color-brand-hover)", borderTopColor: "transparent" }}
                      />
                    )}
                    <span
                      className="font-mono text-xs"
                      style={{ color: isDone ? "var(--color-success)" : "var(--color-text-secondary)" }}
                    >
                      {isDone ? "Completed" : "Running"}{" "}
                      <span
                        style={{
                          color: isDone ? "var(--color-success)" : "var(--color-brand-hover)",
                          fontWeight: 600,
                        }}
                      >
                        {part.toolInvocation.toolName}
                      </span>
                      {!isDone && "…"}
                    </span>
                  </div>
                );
              }
              return null;
            })
          ) : (
            <span>{partsText}</span>
          )}
        </div>
      </div>

      {/* Avatar for User */}
      {isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-lg ml-3 flex items-center justify-center text-xs font-bold mt-1 self-start"
          style={{
            background: "var(--color-surface-3)",
            border: "1px solid var(--color-border-strong)",
            color: "var(--color-text-secondary)",
          }}
          aria-hidden="true"
        >
          U
        </div>
      )}
    </div>
  );
}
