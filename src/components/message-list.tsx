"use client";

import { useState } from "react";
import type { UIMessage } from "@ai-sdk/react";
import MessageBubble from "./message-bubble";

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
  isStreaming = false,
}: MessageListProps) {
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedClick = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
        <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      ),
      badge: "pgvector + BM25 RRF",
      badgeClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      title: "Dual Hybrid RAG Engine",
      subtitle: "Dual vector cosine similarity & full-text keyword search over enterprise policies",
      actionText: "⚡ Try: What is our remote work & IP governance policy?",
      prompt: "What are the zero-trust security policies and database mutation rules in Acme Corp 2026?",
      isActionPrompt: true,
    },
    {
      id: "hitl",
      icon: (
        <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      badge: "LangGraph interrupt()",
      badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      title: "SQL Agent + HITL Approval",
      subtitle: "Two-phase human authorization boundary for safe database mutations",
      actionText: "⚡ Try: Mutate document status to ARCHIVED",
      prompt: "Execute a database mutation to update document title in documents table to ARCHIVED",
      isActionPrompt: true,
    },
    {
      id: "self-correct",
      icon: (
        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
      ),
      badge: "Auto-Retry (Max 3)",
      badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      title: "Cyclic Self-Correction",
      subtitle: "Automatic runtime exception catching & query healing across cyclic graph edges",
      actionText: "⚡ Try: Test query with deliberate schema typo",
      prompt: "Demonstrate self-correction on database tool call error",
      isActionPrompt: true,
    },
    {
      id: "telemetry",
      icon: (
        <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      badge: "OpenTelemetry + OTLP",
      badgeClass: "bg-violet-500/10 text-violet-300 border-violet-500/30",
      title: "State & Telemetry Inspector",
      subtitle: "Inspect live LangGraph cyclic DAG flow, checkpointer state, and P95 latency",
      actionText: "⚡ Open State & Telemetry Inspector",
      onClick: () => onOpenTelemetry?.(),
      isActionPrompt: false,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto relative bg-grid-pattern">
      {/* Ambient Radial Blue/Violet Glow */}
      <div className="ambient-radial-glow" aria-hidden="true" />

      <div className="max-w-4xl mx-auto w-full px-5 sm:px-8 py-8 flex flex-col gap-6 relative z-10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center mt-6 mb-4 select-none max-w-2xl mx-auto w-full">
            {/* Sense AI White Squircle Icon */}
            <div className="mb-6 relative group">
              <div className="w-16 h-16 rounded-[22px] bg-white flex items-center justify-center shadow-[0_0_35px_rgba(255,255,255,0.3)] transition-transform duration-300 group-hover:scale-105">
                {/* Minimalist Nexus Geometric Glyph */}
                <svg className="w-8 h-8 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0b0f19] ring-2 ring-emerald-400/20" />
            </div>

            {/* Monospace Greeting */}
            <p className="text-slate-400 font-mono text-sm tracking-wider uppercase mb-2 font-medium">
              Hi, Md Rizwan
            </p>

            {/* Bold Hero Heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
              Can I help you with anything?
            </h1>

            {/* Centered 2-line Subtitle */}
            <p className="text-xs sm:text-sm font-mono text-slate-400 max-w-lg mb-6 leading-relaxed">
              Nexus Enterprise Knowledge Worker • LangGraph Autonomous RAG
            </p>

            {/* Demo Knowledge Base Ingestion Strip */}
            {onSeedKnowledgeBase && (
              <div className="mb-8 flex items-center gap-2 p-1 pl-3 pr-2 rounded-full bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs text-slate-300 font-mono">
                  Enterprise Knowledge Base:
                </span>
                <button
                  type="button"
                  onClick={handleSeedClick}
                  disabled={isSeeding}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 transition-all cursor-pointer disabled:opacity-50"
                  title="Seed 3 sample governance and architecture docs into PostgreSQL"
                >
                  {isSeeding ? (
                    <>
                      <div className="w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
                      <span>Ingesting pgvector Chunks…</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Seed Demo Knowledge Base</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Bento Quick-Start Feature Cards Grid */}
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
                  className="group relative rounded-2xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between bg-slate-900/40 backdrop-blur-xl border border-white/10 hover:border-violet-500/30 hover:bg-slate-800/50 shadow-xl hover:-translate-y-0.5"
                >
                  <div>
                    {/* Top Row: Icon + Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                        {card.icon}
                      </div>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-semibold tracking-wide border ${card.badgeClass}`}
                      >
                        {card.badge}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors mb-1">
                      {card.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      {card.subtitle}
                    </p>
                  </div>

                  {/* 1-Click Action Chip */}
                  <div className="pt-2 border-t border-white/5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-cyan-300 group-hover:text-cyan-200 transition-colors">
                      {card.actionText} →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message history */}
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
