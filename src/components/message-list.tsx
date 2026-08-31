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
        <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      badge: "Hybrid RAG Engine",
      title: "Hybrid Search RAG",
      subtitle: "pgvector cosine similarity + PostgreSQL tsvector keyword ranking with RRF",
      actionText: "Try: Search enterprise password policies",
      prompt: "What is our company policy on password rotation and API key security?",
      isActionPrompt: true,
    },
    {
      id: "sql-hitl",
      icon: (
        <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      badge: "LangGraph interrupt()",
      title: "SQL Agent + HITL Approval",
      subtitle: "Two-phase human authorization boundary for safe database mutations",
      actionText: "Try: Mutate document status to ARCHIVED",
      prompt: "Execute a database mutation to update document title in documents table to ARCHIVED",
      isActionPrompt: true,
    },
    {
      id: "self-correct",
      icon: (
        <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
      ),
      badge: "Auto-Retry (Max 3)",
      title: "Cyclic Self-Correction",
      subtitle: "Automatic runtime exception catching & query healing across cyclic graph edges",
      actionText: "Try: Test query with deliberate schema typo",
      prompt: "Demonstrate self-correction on database tool call error",
      isActionPrompt: true,
    },
    {
      id: "telemetry",
      icon: (
        <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      badge: "OpenTelemetry + OTLP",
      title: "State & Telemetry Inspector",
      subtitle: "Inspect live LangGraph cyclic DAG flow, checkpointer state, and P95 latency",
      actionText: "Open State & Telemetry Inspector",
      onClick: () => onOpenTelemetry?.(),
      isActionPrompt: false,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto relative bg-[#141720]">
      <div className="ambient-radial-glow" aria-hidden="true" />

      <div className="max-w-3xl mx-auto w-full px-5 sm:px-6 pt-10 pb-6 flex flex-col gap-6 relative z-10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center mt-4 mb-4 select-none max-w-xl mx-auto w-full">
            {/* Center Floating White Squircle (52x52px, rounded-2xl) */ }
            <div className="mb-6">
              <div className="w-[52px] h-[52px] rounded-2xl bg-white flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                <svg className="w-7 h-7 fill-slate-950" viewBox="0 0 32 32">
                  <path d="M16 3.5C14.3 3.5 13.1 5.8 12.5 8.8 11.7 12.3 8.8 15.2 5.2 15.9c-1.2.2-1.2 2 0 2.2 3.6.7 6.5 3.6 7.3 7.1.6 3 1.8 5.3 3.5 5.3s2.9-2.3 3.5-5.3c.8-3.5 3.7-6.4 7.3-7.1 1.2-.2 1.2-2 0-2.2-3.6-.7-6.5-3.6-7.3-7.1-.6-3-1.8-5.3-3.5-5.3z" />
                </svg>
              </div>
            </div>

            {/* Monospace Greeting */ }
            <p className="text-slate-300 font-mono text-sm md:text-base font-medium mb-2">
              Hi, Tommy Radison
            </p>

            {/* Main Title */ }
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
              Can I help you with anything?
            </h1>

            {/* Subtitle */ }
            <p className="text-slate-400 font-mono text-xs md:text-sm leading-relaxed max-w-lg mx-auto mb-8 whitespace-pre-line text-center">
              Ready to assist you with anything you need?\nFrom answering questions, generation to providing recommendations. Let's get started!
            </p>

            {/* Demo Knowledge Base Ingestion Strip */ }
            {onSeedKnowledgeBase && (
              <div className="mb-8 flex items-center gap-2 p-1.5 pl-3 pr-2 rounded-full bg-[#202736]/70 border border-slate-700/50 backdrop-blur-md shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-300 font-mono">
                  Enterprise Knowledge Base:
                </span>
                <button
                  type="button"
                  onClick={handleSeedClick}
                  disabled={isSeeding}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-700/60 hover:bg-slate-600/70 border border-slate-600/50 text-slate-200 transition-all cursor-pointer disabled:opacity-50"
                  title="Seed sample governance and architecture docs into PostgreSQL"
                >
                  {isSeeding ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Ingesting pgvector Chunks...</span>
                    </>
                  ) : (
                    <>
                      <span>Seed Knowledge Base</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2x2 Feature Cards Grid */ }
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
                  className="group relative rounded-2xl p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between bg-[#202736]/70 border border-slate-700/50 hover:bg-[#283144]/90 hover:border-slate-600/70 shadow-lg text-left"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-300">
                        {card.icon}
                      </div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-mono font-medium tracking-wide bg-slate-800/80 border border-slate-700/60 text-slate-300">
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white group-hover:text-white transition-colors mb-1">
                      {card.title}
                    </h3>

                    <p className="text-xs text-slate-400 font-mono leading-relaxed mb-3">
                      {card.subtitle}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-700/40">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-300 group-hover:text-white transition-colors">
                      {card.actionText} →
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
