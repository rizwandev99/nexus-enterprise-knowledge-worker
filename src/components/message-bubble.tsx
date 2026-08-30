"use client";

import { useState } from "react";
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
  const [copied, setCopied] = useState(false);
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

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to format citations [Doc-1], [Doc-2] and text content
  const renderFormattedText = (raw: string) => {
    // Check for attached document header in user message
    if (isUser && raw.includes("--- ATTACHED DOCUMENT CONTENT")) {
      const match = raw.match(/\[ATTACHED DOCUMENT:\s*([^\]]+)\]/);
      const docName = match ? match[1] : "Document";
      const userPrompt = raw.split("\n\n[ATTACHED DOCUMENT:")[0].trim();

      return (
        <div className="space-y-2">
          {userPrompt && <div>{userPrompt}</div>}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-white/10 border border-white/20 text-teal-200">
            <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span>Attached: {docName}</span>
          </div>
        </div>
      );
    }

    // Highlight [Doc-X] citations as high-tech pills
    const citationRegex = /(\[Doc-\d+\])/g;
    const partsWithCitations = raw.split(citationRegex);

    return (
      <span>
        {partsWithCitations.map((token, i) => {
          if (citationRegex.test(token)) {
            return (
              <span
                key={i}
                className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40 select-all"
                title="Verified Hybrid RAG Footnote Citation"
              >
                {token}
              </span>
            );
          }
          return <span key={i}>{token}</span>;
        })}
      </span>
    );
  };

  return (
    <div className={`group flex msg-animate relative ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar for AI */}
      {!isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-lg mr-3 flex items-center justify-center text-xs font-bold mt-1 self-start select-none"
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
        className={`relative max-w-[80%] rounded-2xl transition-all ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
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
        {/* Header row with role badge + Copy Button */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <div
            className="text-[10px] font-semibold uppercase tracking-widest font-mono"
            style={{
              color: isUser ? "rgba(255,255,255,0.6)" : "var(--color-brand-hover)",
              letterSpacing: "0.12em",
            }}
          >
            {isUser ? "You" : "Nexus AI"}
          </div>

          <button
            onClick={() => handleCopy(partsText)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white flex items-center gap-1 text-[11px]"
            title="Copy message"
            aria-label="Copy message"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-teal-400 font-mono">Copied</span>
              </>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap prose-dark">
          {Array.isArray(parts) && parts.length > 0 ? (
            parts.map((part, index) => {
              if (part.type === "text") return <div key={index}>{renderFormattedText(part.text)}</div>;

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
                      {isDone ? "Executed Tool" : "Invoking Tool"}:{" "}
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
            renderFormattedText(partsText)
          )}
        </div>
      </div>

      {/* Avatar for User */}
      {isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-lg ml-3 flex items-center justify-center text-xs font-bold mt-1 self-start select-none"
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

