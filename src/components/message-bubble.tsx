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
  const partsText = Array.isArray(message.parts)
    ? (message.parts as MessagePart[])
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => p.text)
        .join("")
    : "";

  const textContent = partsText;

  if (
    textContent === "[HUMAN_APPROVAL_YES]" || 
    textContent === "[HUMAN_APPROVAL_NO]" ||
    textContent.includes("__APPROVAL_REQUEST__")
  ) {
    return null;
  }

  const parts = message.parts as MessagePart[] | undefined;
  const hasContent = textContent.trim() || (Array.isArray(parts) && parts.some(p => p.type === "tool-invocation"));
  if (!hasContent) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`p-6 rounded-lg max-w-[85%] border border-hairline ${isUser ? "bg-primary text-on-primary" : "bg-canvas text-ink shadow-sm"}`}>
        <div className="font-mono text-[12px] mb-3 opacity-60 uppercase tracking-wider">
          {isUser ? "You" : "Nexus AI"}
        </div>
        <div className="text-[16px] leading-[24px] whitespace-pre-wrap">
          {Array.isArray(parts) && parts.length > 0 ? (
            parts.map((part, index) => {
              if (part.type === "text") return <span key={index}>{part.text}</span>;

              if (part.type === "tool-invocation") {
                const isDone = part.toolInvocation.state === "result";
                return (
                  <div key={index} className="mt-4 mb-4 p-3 bg-canvas-soft border border-hairline rounded-md flex items-center gap-3">
                    {isDone ? (
                      <span className="text-success text-xs font-bold">✓</span>
                    ) : (
                      <div className="w-3 h-3 border-2 border-mute border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="font-mono text-xs font-medium text-body">
                      {isDone ? "Ran" : "Running"} <span className="text-link font-semibold">{part.toolInvocation.toolName}</span>{!isDone && "…"}
                    </span>
                  </div>
                );
              }
              return null;
            })
          ) : (
            <span>{textContent}</span>
          )}
        </div>
      </div>
    </div>
  );
}
