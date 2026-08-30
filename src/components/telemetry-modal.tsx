"use client";

import { useEffect, useState, useCallback } from "react";
import { getSystemMetrics } from "@/app/chat-actions";

interface TelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChatId: string | null;
}

interface MetricsData {
  status: string;
  documentCount: number;
  sessionCount: number;
  messageCount: number;
  vectorEngine: string;
  llmModel: string;
  stateMachine: string;
}

export default function TelemetryModal({ isOpen, onClose, activeChatId }: TelemetryModalProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSystemMetrics();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load telemetry metrics:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen, fetchMetrics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-2xl rounded-2xl p-6 overflow-hidden border border-white/10 shadow-2xl z-10 flex flex-col gap-5 text-gray-100"
        style={{
          background: "linear-gradient(180deg, rgba(16, 18, 27, 0.95) 0%, rgba(9, 10, 15, 0.98) 100%)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(94, 234, 212, 0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Live Agent Telemetry & Tracing
              </h2>
              <p className="text-xs text-gray-400">
                LangGraph State Machine • OpenTelemetry Traces • Vector DB Health
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium">Knowledge Docs</span>
            <span className="text-xl font-bold text-teal-300 mt-1 font-mono">
              {isLoading ? "…" : metrics?.documentCount ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium">Chat Sessions</span>
            <span className="text-xl font-bold text-indigo-300 mt-1 font-mono">
              {isLoading ? "…" : metrics?.sessionCount ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium">Total Messages</span>
            <span className="text-xl font-bold text-purple-300 mt-1 font-mono">
              {isLoading ? "…" : metrics?.messageCount ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium">System Health</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                {metrics?.status ?? "Active"}
              </span>
            </div>
          </div>
        </div>

        {/* State Machine Visualizer */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-3">
          <span className="text-xs font-semibold text-gray-300 tracking-wide flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Active LangGraph Directed Cyclic Flow
          </span>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono py-2 px-3 rounded-lg bg-white/5 border border-white/5">
            <div className="flex items-center gap-1 text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded border border-teal-800/60">
              <span>ragNode</span>
              <span className="text-[10px] text-teal-400">(RRF k=60)</span>
            </div>
            <span className="text-gray-500">→</span>

            <div className="flex items-center gap-1 text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-800/60">
              <span>reasoningNode</span>
              <span className="text-[10px] text-indigo-400">(Groq 120B)</span>
            </div>
            <span className="text-gray-500">→</span>

            <div className="flex items-center gap-1 text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/60">
              <span>approvalNode</span>
              <span className="text-[10px] text-amber-400">(interrupt)</span>
            </div>
            <span className="text-gray-500">→</span>

            <div className="flex items-center gap-1 text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60">
              <span>toolsNode</span>
              <span className="text-[10px] text-emerald-400">(self-heal)</span>
            </div>
          </div>
        </div>

        {/* Architectural Specs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
            <span className="text-gray-400 font-medium">Orchestration & State Checkpointer</span>
            <div className="text-gray-200 font-mono text-[11px]">
              PostgresSaver (@langchain/langgraph-checkpoint-postgres)
            </div>
            <div className="text-[11px] text-gray-500">
              Active Thread ID: <span className="text-teal-400 font-mono">{activeChatId || "New Thread"}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
            <span className="text-gray-400 font-medium">Hybrid Search Vector Engine</span>
            <div className="text-gray-200 font-mono text-[11px]">
              pgvector (Cosine) + tsvector (Full-Text)
            </div>
            <div className="text-[11px] text-gray-500">
              Reciprocal Rank Fusion with <span className="text-teal-400 font-mono">k = 60</span> constant
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <span className="text-gray-500 font-mono text-[11px]">
            OpenTelemetry OTLP trace exporter active
          </span>
          <div className="flex gap-2">
            <button
              onClick={fetchMetrics}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-all font-medium flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              Refresh
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
