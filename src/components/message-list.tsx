"use client";

import { useState } from "react";
import MessageBubble from "./message-bubble";
import type { UIMessage } from "@ai-sdk/react";

export interface MessageListProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSelectPrompt?: (prompt: string) => void;
  onSeedKnowledgeBase?: () => Promise<void>;
  onSelectCitation?: (docIndex: number) => void;
  onOpenTelemetry?: () => void;
  selectedModel?: string;
  isStreaming?: boolean;
}

export default function MessageList({
  messages,
  messagesEndRef,
  onSelectPrompt,
  onSeedKnowledgeBase,
  onSelectCitation,
  onOpenTelemetry,
  selectedModel,
  isStreaming,
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
      id: "rag",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      ),
      badge: "Hybrid RAG Engine",
      title: "Hybrid Search RAG",
      description:
        "pgvector cosine similarity + PostgreSQL tsvector keyword ranking with RRF",
      actionText: "Try: Search enterprise password policies",
      prompt:
        "What is our company policy on password rotation and API key security?",
      isActionPrompt: true,
    },
    {
      id: "sql-hitl",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      badge: "LangGraph interrupt()",
      title: "SQL Agent + HITL Approval",
      description:
        "Two-phase human authorization boundary for safe database mutations",
      actionText: "Try: Mutate document status to ARCHIVED",
      prompt:
        "Execute a database mutation to update document title in documents table to ARCHIVED",
      isActionPrompt: true,
    },
    {
      id: "self-correct",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
      ),
      badge: "Auto-Retry (Max 3)",
      title: "Cyclic Self-Correction",
      description:
        "Automatic runtime exception catching & query healing across cyclic graph edges",
      actionText: "Try: Test query with deliberate schema typo",
      prompt: "Demonstrate self-correction on database tool call error",
      isActionPrompt: true,
    },
    {
      id: "telemetry",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.48 12H2" />
        </svg>
      ),
      badge: "OpenTelemetry + OTLP",
      title: "State & Telemetry Inspector",
      description:
        "Inspect live LangGraph cyclic DAG flow, checkpointer state, and P95 latency",
      actionText: "Open State & Telemetry Inspector",
      onClick: () => onOpenTelemetry?.(),
      isActionPrompt: false,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto relative bg-[#08090b]">
      <div className="ambient-radial-glow" aria-hidden="true" />

      <div className="max-w-3xl mx-auto w-full px-5 sm:px-6 pt-10 pb-6 flex flex-col gap-6 relative z-10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center mt-4 mb-4 select-none max-w-2xl mx-auto w-full">
            {/* 1. Brand Mark: Clean, refined 48x48px white squircle with precision black vector aperture/star glyph */}
            <div className="mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-[0_4px_24px_rgba(255,255,255,0.18)] flex items-center justify-center">
                <svg className="w-6 h-6 fill-slate-950" viewBox="0 0 24 24">
                  <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z" />
                </svg>
              </div>
            </div>

            {/* 2. Greeting: Hi, User */}
            <p className="text-xs font-mono tracking-widest text-slate-400 uppercase font-medium mb-3">
              Hi, User
            </p>

            {/* 3. Heading: Can I help you with anything? */}
            <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.03em] text-white mb-3 text-center">
              Can I help you with anything?
            </h1>

            {/* 4. Subtitle */}
            <p className="text-sm text-slate-400/90 max-w-lg mx-auto text-center mb-8 leading-relaxed font-normal">
              Ready to assist you with anything you need — from enterprise knowledge retrieval to safe database mutations.
            </p>

            {/* 5. Knowledge Base Status Chip */}
            {onSeedKnowledgeBase && (
              <button
                type="button"
                onClick={handleSeedClick}
                disabled={isSeeding}
                className="text-xs font-mono text-slate-200 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.12] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] rounded-full px-4 py-1.5 transition-all flex items-center gap-2 mx-auto mb-8 cursor-pointer disabled:opacity-50"
                title="Click to re-index / verify enterprise knowledge documents in PostgreSQL pgvector"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">Enterprise KB:</span>
                {isSeeding ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-200">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ingesting pgvector Chunks...
                  </span>
                ) : (
                  <span className="text-emerald-300 font-medium hover:text-white transition-colors">
                    3 Indexed Docs Active (pgvector)
                  </span>
                )}
              </button>
            )}

            {/* 6. Bento Grid (4 Cards in 2x2 grid with pronounced Rich Glassmorphism) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
              {featureCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => {
                    if (card.isActionPrompt && card.prompt) {
                      onSelectPrompt?.(card.prompt);
                    } else if (card.onClick) {
                      card.onClick();
                    }
                  }}
                  className="glass-card hover:border-white/25 hover:bg-white/[0.06] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_20px_40px_rgba(0,0,0,0.6)] hover:-translate-y-1 rounded-2xl p-5 group text-left cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      {card.icon}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-300 border border-white/[0.10]">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-medium text-white tracking-tight mt-3 mb-1">
                    {card.title}
                  </h3>

                  <p className="text-xs text-slate-400/90 leading-relaxed">
                    {card.description}
                  </p>

                  <div className="text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 mt-3.5 pt-3 border-t border-white/[0.08] group-hover:text-white transition-colors">
                    <span>{card.actionText}</span>
                    <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => (
          <MessageBubble
            key={m.id}
            message={m}
            isUser={m.role === "user"}
            onSelectCitation={onSelectCitation}
            selectedModel={selectedModel}
            isStreaming={isStreaming && idx === messages.length - 1}
          />
        ))}

        <div ref={messagesEndRef} className="h-2" />
      </div>
    </div>
  );
}
