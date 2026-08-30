"use client";

import { useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import MessageBubble from "./message-bubble";

interface MessageListProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSelectPrompt?: (prompt: string) => void;
  onSeedKnowledgeBase?: () => Promise<void>;
}

export default function MessageList({
  messages,
  messagesEndRef,
  onSelectPrompt,
  onSeedKnowledgeBase,
}: MessageListProps) {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedClick = async () => {
    if (!onSeedKnowledgeBase || isSeeding) return;
    setIsSeeding(true);
    try {
      await onSeedKnowledgeBase();
    } finally {
      setIsSeeding(false);
    }
  };

  const featureCards = [
    {
      badge: "Hybrid RAG Engine",
      badgeClass: "bg-[#132e35] text-[#5eead4] border-[#1d4d58]",
      title: "Query Knowledge Base",
      subtitle: "pgvector + tsvector full-text search with Reciprocal Rank Fusion",
      prompt: "What are the zero-trust security policies and database mutation rules in Acme Corp 2026?",
    },
    {
      badge: "SQL Agent + HITL",
      badgeClass: "bg-[#3b1c24] text-[#fca5a5] border-[#5e2734]",
      title: "Safe Data Mutations",
      subtitle: "Mutate database records safely with graph-level human approval modal",
      prompt: "Execute a database mutation to update document title in documents table",
    },
    {
      badge: "Self-Correction Graph",
      badgeClass: "bg-[#163522] text-[#86efac] border-[#205234]",
      title: "LangGraph Orchestration",
      subtitle: "Stateful cyclic graph with automatic tool exception self-healing",
      prompt: "Demonstrate self-correction on database tool call error",
    },
    {
      badge: "OpenTelemetry",
      badgeClass: "bg-[#2d1b3f] text-[#d8b4fe] border-[#472965]",
      title: "Enterprise Tracing",
      subtitle: "End-to-end OpenTelemetry instrumentation for LLM & tool executions",
      prompt: "What are the SLA uptime targets and P95 latency specifications for Nexus microservices?",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto relative bg-grid-pattern">
      {/* Top Floating Glass Orb (Visual from Inspiration Image) */}
      <div className="fluid-orb" aria-hidden="true" />

      <div className="max-w-4xl mx-auto w-full px-6 py-8 flex flex-col gap-6 relative z-10">
        {messages.length === 0 && (
          <div className="flex flex-col items-start mt-10 mb-6 select-none max-w-3xl mx-auto w-full">
            {/* Top Action Pill for Seeding */}
            {onSeedKnowledgeBase && (
              <button
                onClick={handleSeedClick}
                disabled={isSeeding}
                className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-teal-500/30 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 hover:border-teal-400 transition-all cursor-pointer shadow-lg shadow-teal-950/40"
              >
                {isSeeding ? (
                  <div className="w-3.5 h-3.5 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                )}
                <span>{isSeeding ? "Seeding PostgreSQL Chunks…" : "⚡ Seed Demo Knowledge Base (3 Enterprise Docs)"}</span>
              </button>
            )}

            {/* Main Hero Greeting */}
            <h1
              className="text-4xl sm:text-5xl font-light tracking-tight mb-2 leading-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              Hey! Enterprise Worker
            </h1>
            <h2
              className="text-3xl sm:text-4xl font-normal tracking-tight mb-8 text-gray-300"
            >
              What can I help with?
            </h2>

            {/* Feature Bento Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full mb-8">
              {featureCards.map((card) => (
                <div
                  key={card.badge}
                  onClick={() => onSelectPrompt?.(card.prompt)}
                  className="group relative rounded-2xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between"
                  style={{
                    background: "rgba(18, 20, 27, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div className="mb-3">
                    {/* Feature Badge Pill */}
                    <span
                      className={`inline-block px-3 py-1 rounded-lg text-[11px] font-semibold tracking-wide border mb-3 transition-transform group-hover:scale-105 ${card.badgeClass}`}
                    >
                      {card.badge}
                    </span>
                    {/* Title */}
                    <h3
                      className="text-sm font-semibold mb-1 group-hover:text-teal-400 transition-colors"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {card.title}
                    </h3>
                  </div>

                  {/* Subtitle / Description */}
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {card.subtitle}
                  </p>

                  {/* Hover indicator arrow */}
                  <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-teal-400 text-xs font-mono font-medium">Try feature →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isUser={m.role === "user"} />
        ))}

        <div ref={messagesEndRef} className="h-2" />
      </div>
    </div>
  );
}

