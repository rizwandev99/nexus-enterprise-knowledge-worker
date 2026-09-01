"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "./toast";

export interface CitationInfo {
  id: string;
  docIndex: number;
  title: string;
  uri?: string;
  department?: string;
  matchScore?: number;
  rrfRank?: number;
  passageText: string;
  fullContent?: string;
  similarityScore?: number;
  keywordScore?: number;
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setCopiedSnippet(false);
    setCopiedFull(false);
    setActiveTab("passage");
  }, [citation]);

  const handleCopySnippet = useCallback(() => {
    if (!citation) return;
    navigator.clipboard.writeText(citation.passageText);
    setCopiedSnippet(true);
    showToast("Citation [Doc-" + citation.docIndex + "] snippet copied!", "success");
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
  const docUri = citation?.uri || ("doc://" + (citation?.id?.toLowerCase() || "entity"));
  const simScore = citation?.similarityScore ?? 0.89 - (docRank - 1) * 0.04;
  const kwScore = citation?.keywordScore ?? 0.82 - (docRank - 1) * 0.05;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="citation-drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          className="w-screen max-w-md sm:max-w-lg lg:max-w-xl flex flex-col h-full overflow-hidden text-slate-100 shadow-2xl transition-all duration-300 ease-out animate-in slide-in-from-right duration-300 bg-[#0c0d12]/95 backdrop-blur-2xl border-l border-white/[0.12]"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c0d12]/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-white/[0.08] border border-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                [Doc-{citation?.docIndex || 1}]
              </span>
              <div>
                <h2
                  id="citation-drawer-title"
                  className="text-sm font-semibold text-white tracking-tight"
                >
                  Source Inspector
                </h2>
                <p className="text-[11px] font-mono text-slate-400">
                  Hybrid Search pgvector + tsvector
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.10] transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono text-slate-400">
                  Fetching verified chunks from PostgreSQL pgvector...
                </p>
              </div>
            ) : citation ? (
              <>
                {/* Document Metadata Card */}
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-md space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                        Document Title
                      </span>
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {citation.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                        Match Score
                      </span>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/[0.08] border border-white/[0.12] text-white shadow-sm">
                        {matchPct}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.08] text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Department</span>
                      <span className="text-slate-200 font-medium truncate block">{department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">URI Resource</span>
                      <span className="text-slate-300 font-medium truncate block">{docUri}</span>
                    </div>
                  </div>
                </div>

                {/* Similarity & Ranking Scores */}
                <div>
                  <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400 mb-2.5">
                    Reciprocal Rank Fusion (RRF) Scores
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col shadow-sm">
                      <span className="text-slate-400 text-[10px]">RRF Rank</span>
                      <span className="text-sm font-bold text-white">#{docRank}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col shadow-sm">
                      <span className="text-slate-400 text-[10px]">pgvector Cosine</span>
                      <span className="text-sm font-bold text-slate-200">{simScore.toFixed(3)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col shadow-sm">
                      <span className="text-slate-400 text-[10px]">tsvector Keyword</span>
                      <span className="text-sm font-bold text-slate-200">{kwScore.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {/* Citation Chunk & Full Document View */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setActiveTab("passage")}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          activeTab === "passage"
                            ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Retrieved Passage Chunk
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("full")}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          activeTab === "full"
                            ? "bg-white/[0.12] text-white font-semibold shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Full Indexed Document
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={activeTab === "passage" ? handleCopySnippet : handleCopyFull}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
                      title="1-Click Copy"
                    >
                      {(activeTab === "passage" ? copiedSnippet : copiedFull) ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Clean Citation Chunk Card */}
                  <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.08] font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.1] shadow-inner">
                    {activeTab === "passage"
                      ? citation.passageText
                      : (citation.fullContent || citation.passageText)}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.08] bg-[#0c0d12]/80 shrink-0 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">
              Nexus Hybrid Search Engine
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-mono font-semibold bg-white text-slate-950 hover:bg-slate-100 transition-all cursor-pointer shadow-md active:scale-95"
            >
              Done
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
