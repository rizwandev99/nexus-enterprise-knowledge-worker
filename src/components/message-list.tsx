"use client";

import type { UIMessage } from "@ai-sdk/react";
import MessageBubble from "./message-bubble";

interface MessageListProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function MessageList({ messages, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto relative">
      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-24 select-none">
            {/* Brand mark */}
            <div
              className="w-14 h-14 rounded-2xl mb-6 flex items-center justify-center text-2xl font-bold"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
                boxShadow: "0 0 40px var(--color-brand-glow), 0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              N
            </div>

            <h2
              className="text-2xl font-semibold tracking-tight mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Welcome to{" "}
              <span className="gradient-text">Nexus</span>
            </h2>
            <p className="text-sm text-center max-w-sm" style={{ color: "var(--color-text-secondary)" }}>
              Your enterprise knowledge worker. Powered by hybrid RAG, LangGraph agents, and real-time streaming.
            </p>

            {/* Quick-start bento cards */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
              {[
                { icon: "🔍", label: "Search knowledge", hint: "Search across enterprise documents" },
                { icon: "🗄️", label: "Query data", hint: "Run SQL on your data warehouse" },
                { icon: "🧠", label: "Analyze & reason", hint: "Multi-step agent reasoning" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bento-card p-4 cursor-default transition-all duration-200"
                  style={{ animationDelay: "0.1s" }}
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                    {item.label}
                  </div>
                  <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {item.hint}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isUser={m.role === "user"} />
        ))}

        <div ref={messagesEndRef} className="h-2" />
      </div>
    </div>
  );
}
