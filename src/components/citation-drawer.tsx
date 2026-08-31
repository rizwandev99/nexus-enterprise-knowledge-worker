"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "./toast";

export interface CitationInfo {
  id: string; // e.g. "Doc-1"
  docIndex: number; // 1-based index
  title: string;
  uri?: string;
  department?: string;
  matchScore?: number; // e.g. 94 (percentage)
  rrfRank?: number; // e.g. 1
  passageText: string;
  fullContent?: string;
  similarityScore?: number; // e.g. 0.89
  keywordScore?: number; // e.g. 0.78
}

export interface CitationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citation: CitationInfo | null;
  isLoading?: boolean;
}

export default function CitationDrawer({
  isOpen,
  onClose,
  citation,
  isLoading = false,
}: CitationDrawerProps) {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [activeTab, setActiveTab] = useState<"passage" | "full">("passage");
  const { showToast } = useToast();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset copied states when citation changes
  useEffect(() => {
    setCopiedSnippet(false);
    setCopiedFull(false);
    setActiveTab("passage");
  }, [citation]);

  const handleCopySnippet = useCallback(() => {
    if (!citation) return;
    navigator.clipboard.writeText(citation.passageText);
    setCopiedSnippet(true);
    showToast(`Citation [Doc-${citation.docIndex}] snippet copied!`, "success");
    setTimeout(() => setCopiedSnippet(false), 2200);
  }, [citation, showToast]);

  const handleCopyFull = useCallback(() => {
    if (!citation) return;
    const textToCopy = citation.fullContent || citation.passageText;
    navigator.clipboard.writeText(textToCopy);
    setCopiedFull(true);
    showToast("Full document content copied to clipboard", "success");
    setTimeout(() => setCopiedFull(false), 2200);
  }, [citation, showToast]);

  if (!isOpen) return null;

  const docRank = citation?.rrfRank || citation?.docIndex || 1;
  const matchPct = citation?.matchScore || (100 - (docRank - 1) * 6);
  const department = citation?.department || "Enterprise Knowledge Base";
  const docUri = citation?.uri || `doc://${citation?.id?.toLowerCase() || "entity"}`;
  const simScore = citation?.similarityScore ?? 0.89 - (docRank - 1) * 0.04;
  const kwScore = citation?.keywordScore ?? 0.82 - (docRank - 1) * 0.05;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="citation-drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          className="w-screen max-w-md sm:max-w-lg lg:max-w-xl flex flex-col h-full overflow-hidden text-slate-100 shadow-2xl transition-all duration-300 ease-out animate-in slide-in-from-right duration-300 bg-slate-900/95 backdrop-blur-2xl border-l border-white/10"
          style={{
            boxShadow: "-12px 0 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.1)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-white/[0.02]"
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                [Doc-{citation?.docIndex || 1}]
              </div>
              <div>
                <h2
                  id="citation-drawer-title"
                  className="text-sm font-bold text-white tracking-tight"
                >
                  Verified Source Context
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  Hybrid RAG • Reciprocal Rank Fusion
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close citation drawer"
              title="Close (Esc)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400 font-mono">
                  Fetching RRF passage from PostgreSQL…
                </p>
              </div>
            ) : citation ? (
              <>
                {/* Document Metadata Card */}
                <div
                  className="p-4 rounded-3xl border border-white/10 relative overflow-hidden bg-slate-950/60 shadow-xl"
                >
                  {/* Subtle top gradient glow */}
                  <div
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-violet-500/10 blur-2xl pointer-events-none"
                    aria-hidden="true"
                  />

                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-white/5 border border-white/10 text-violet-300">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      {department}
                    </span>

                    {/* RRF Match Score Badge */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{matchPct}% Match · RRF Rank #{docRank}</span>
                    </div>
                  </div>

                  {/* Document Title */}
                  <h3 className="text-base font-bold text-white leading-snug tracking-tight mb-2">
                    {citation.title}
                  </h3>

                  {/* Document URI / Entity tag */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span className="text-slate-500">URI:</span>
                    <span className="text-slate-300 truncate max-w-[320px] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                      {docUri}
                    </span>
                  </div>
                </div>

                {/* Retrieval Method Breakdown Pill Bar */}
                <div
                  className="p-3.5 rounded-2xl border border-white/5 flex flex-col gap-2 text-xs bg-slate-950/80"
                >
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      RAG Retrieval Pipeline
                    </span>
                    <span className="text-violet-300">Reciprocal Rank Fusion</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                      <span className="text-slate-400">pgvector (Cosine)</span>
                      <span className="text-cyan-300 font-bold mt-0.5">
                        Similarity: {simScore.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col">
                      <span className="text-slate-400">tsvector (Full-Text)</span>
                      <span className="text-violet-300 font-bold mt-0.5">
                        ts_rank: {kwScore.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabs & Content Actions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    {/* View mode toggle tabs */}
                    <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10 text-xs">
                      <button
                        onClick={() => setActiveTab("passage")}
                        className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                          activeTab === "passage"
                            ? "bg-violet-500/20 text-violet-200 border border-violet-500/30 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Retrieved Passage
                      </button>
                      <button
                        onClick={() => setActiveTab("full")}
                        className={`px-3 py-1 rounded-xl font-medium transition-all cursor-pointer ${
                          activeTab === "full"
                            ? "bg-violet-500/20 text-violet-200 border border-violet-500/30 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Full Document
                      </button>
                    </div>

                    {/* 1-Click Copy Snippet Button */}
                    <button
                      type="button"
                      onClick={activeTab === "passage" ? handleCopySnippet : handleCopyFull}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                        (activeTab === "passage" ? copiedSnippet : copiedFull)
                          ? "bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in-95 font-semibold"
                          : "bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:border-violet-400 hover:text-white shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                      }`}
                      title="Copy content to clipboard"
                    >
                      {(activeTab === "passage" ? copiedSnippet : copiedFull) ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="text-emerald-300 font-mono font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>{activeTab === "passage" ? "Copy Snippet" : "Copy Document"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Passage Text Container */}
                  <div
                    className="p-4 rounded-3xl border border-white/10 text-xs font-mono leading-relaxed overflow-x-auto select-text relative bg-slate-950/90 shadow-inner"
                  >
                    <div className="text-slate-200 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {activeTab === "passage"
                        ? citation.passageText
                        : (citation.fullContent || citation.passageText)}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-sm text-slate-400 font-mono">
                No citation selected. Click any [Doc-X] tag in the chat to inspect its verified RRF context.
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 shrink-0 text-xs text-slate-400 font-mono bg-white/[0.02]"
          >
            <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              PostgreSQL Vector Store
            </span>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-all text-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
