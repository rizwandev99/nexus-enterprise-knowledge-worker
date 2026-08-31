"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getChatSessions,
  deleteChatSession,
  renameChatSession,
  deleteAllChatSessions,
} from "../app/chat-actions";
import { useToast } from "./toast";

type ChatSession = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type DeleteTarget =
  | { type: "single"; id: string; title: string }
  | { type: "all" }
  | null;

export default function Sidebar({
  activeChatId,
  onSelectChat,
  isOpen = true,
  onClose,
  onToggleDrawer,
  refreshTrigger = 0,
  onOpenTelemetry,
  onExportChat,
  onSeedKnowledgeBase,
}: {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onToggleDrawer?: () => void;
  refreshTrigger?: number;
  onOpenTelemetry?: () => void;
  onExportChat?: () => void;
  onSeedKnowledgeBase?: () => Promise<void>;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const { showToast } = useToast();

  const loadSessions = useCallback(async () => {
    try {
      const data = await getChatSessions();
      setSessions(data || []);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, activeChatId, refreshTrigger]);

  const handleNewChat = () => {
    onSelectChat("");
  };

  const handleSeedClick = async () => {
    if (!onSeedKnowledgeBase || isSeeding) return;
    setIsSeeding(true);
    try {
      await onSeedKnowledgeBase();
      await loadSessions();
    } finally {
      setIsSeeding(false);
    }
  };

  const openDeleteModal = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setDeleteTarget({ type: "single", id: session.id, title: session.title || "Untitled Session" });
  };

  const openClearAllModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ type: "all" });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "single") {
        await deleteChatSession(deleteTarget.id);
        await loadSessions();
        if (activeChatId === deleteTarget.id) onSelectChat("");
        showToast("Chat deleted", "success");
      } else {
        await deleteAllChatSessions();
        await loadSessions();
        onSelectChat("");
        showToast("All chats deleted", "success");
      }
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const startRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = async () => {
    if (editingId && editTitle.trim()) {
      try {
        await renameChatSession(editingId, editTitle.trim());
        await loadSessions();
      } catch {
        showToast("Failed to rename chat", "error");
      }
    }
    setEditingId(null);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className="flex h-full shrink-0 z-40">
        {/* 1. Left Vertical Icon Rail (Linear-style 56px Matte Glass Rail) */}
        <div
          className="w-14 h-full flex flex-col items-center justify-between py-3.5 shrink-0 border-r border-white/[0.08] bg-[#0c0d12]/95 backdrop-blur-2xl select-none"
        >
          <div className="flex flex-col items-center gap-4">
            {/* Top brand mark: 36x36px white squircle with black vector aperture glyph -> Toggles Sessions Drawer */}
            <button
              onClick={() => (onToggleDrawer ? onToggleDrawer() : onClose?.())}
              className="w-9 h-9 rounded-xl bg-white text-slate-950 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-[0_2px_16px_rgba(255,255,255,0.18)] cursor-pointer"
              aria-label="Toggle Sidebar Sessions Drawer"
              title="Toggle Sessions Drawer (Ctrl+B)"
            >
              <svg className="w-4 h-4 fill-slate-950" viewBox="0 0 24 24">
                <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z" />
              </svg>
            </button>

            <div className="w-6 h-px bg-white/[0.08]" />

            <nav className="flex flex-col items-center gap-2">
              {/* Plus: New Chat */}
              <button
                onClick={handleNewChat}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                title="Start New Chat Session"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
              </button>

              {/* MessageSquare: Toggle Sessions Drawer */}
              <button
                onClick={() => (onToggleDrawer ? onToggleDrawer() : onClose?.())}
                className={"p-2.5 rounded-xl transition-all relative cursor-pointer " + (isOpen ? "bg-white/[0.12] text-white border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" : "text-slate-400 hover:text-white hover:bg-white/[0.08]")}
                title="Toggle Chat Sessions (PostgreSQL Checkpointer)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {sessions.length > 0 && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-[#0c0d12]" />
                )}
              </button>

              {/* Activity: Telemetry & Tracing */}
              <button
                onClick={() => onOpenTelemetry?.()}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                title="Live LangGraph State Machine & OTel Traces Inspector"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </button>

              {/* Database: Seed Knowledge Base */}
              {onSeedKnowledgeBase && (
                <button
                  onClick={handleSeedClick}
                  disabled={isSeeding}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-50 cursor-pointer"
                  title="Seed Knowledge Base (3 Enterprise Docs into pgvector)"
                >
                  {isSeeding ? (
                    <div className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                    </svg>
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* Github */}
          <div className="flex flex-col items-center gap-2">
            <a
              href="https://github.com/rizwandev99/nexus-enterprise-knowledge-worker"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
              title="View Source Code & Architecture on GitHub"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>

        {/* 2. Expandable Sessions Drawer */}
        <aside
          className={"fixed inset-y-0 left-14 z-40 bg-[#0c0d12]/95 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col overflow-hidden transition-all duration-300 ease-out md:relative md:left-0 " + (isOpen ? "translate-x-0 w-60 opacity-100" : "-translate-x-full w-60 md:w-0 md:translate-x-0 md:opacity-0")}
        >
          <div className="w-60 flex flex-col h-full">
            <div className="h-12 flex items-center justify-between px-3.5 border-b border-white/[0.08] shrink-0 bg-[#0c0d12]/60">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Chat Sessions
              </span>
              <div className="flex items-center gap-1">
                {activeChatId && onExportChat && (
                  <button
                    onClick={onExportChat}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors text-xs cursor-pointer"
                    title="Export Current Chat to Markdown"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                )}
                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={openClearAllModal}
                    className="px-2 py-0.5 rounded-lg transition-all text-[11px] font-mono cursor-pointer text-slate-400 hover:text-rose-400 hover:bg-white/[0.08]"
                    title="Clear all chat sessions"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  No previous sessions yet
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = activeChatId === session.id;
                  const isHovered = hoveredId === session.id;

                  return (
                    <div
                      key={session.id}
                      onClick={() => onSelectChat(session.id)}
                      onMouseEnter={() => setHoveredId(session.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={"group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all " + (isActive ? "bg-white/[0.10] text-white font-medium border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" : "text-slate-300 hover:bg-white/[0.06] hover:text-white")}
                    >
                      {editingId === session.id ? (
                        <input
                          autoFocus
                          className="w-full bg-transparent text-xs outline-none border-b border-white text-white font-mono"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={saveRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-1">
                          <span className="text-slate-500 font-mono text-[10px]">#</span>
                          <span className="truncate">{session.title || "Untitled Session"}</span>
                        </div>
                      )}

                      {isHovered && editingId !== session.id && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startRename(e, session)}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.10] transition-colors"
                            title="Rename chat"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openDeleteModal(e, session)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/[0.10] transition-colors"
                            title="Delete chat"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Linear-grade Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#121622]/95 border border-white/[0.1] p-5 shadow-2xl backdrop-blur-2xl text-left relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {deleteTarget.type === "all" ? "Clear All Conversations?" : "Delete Conversation?"}
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              {deleteTarget.type === "all"
                ? "Are you sure you want to delete all chat sessions? This action cannot be undone."
                : "Are you sure you want to delete this chat session? This action cannot be undone."}
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 rounded-xl px-4 py-2 text-xs font-medium border border-white/[0.08] transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2 text-xs font-medium shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
