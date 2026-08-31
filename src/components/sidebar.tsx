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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      try {
        await deleteChatSession(id);
        await loadSessions();
        if (activeChatId === id) onSelectChat("");
        setConfirmDeleteId(null);
        showToast("Chat deleted", "success");
      } catch {
        showToast("Failed to delete chat", "error");
      }
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const handleDeleteAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteAll) {
      try {
        await deleteAllChatSessions();
        await loadSessions();
        onSelectChat("");
        setConfirmDeleteAll(false);
        showToast("All chats deleted", "success");
      } catch {
        showToast("Failed to delete chats", "error");
      }
    } else {
      setConfirmDeleteAll(true);
      setTimeout(() => setConfirmDeleteAll(false), 3000);
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
        {/* 1. Left Vertical Icon Rail (Sense AI Navigation) */ }
        <div
          className="w-16 h-full flex flex-col items-center justify-between py-5 shrink-0 border-r border-slate-700/50 bg-[#181c26]"
        >
          <div className="flex flex-col items-center gap-5">
            <button
              onClick={() => (onToggleDrawer ? onToggleDrawer() : onClose?.())}
              className="w-10 h-10 rounded-2xl bg-white text-slate-950 flex items-center justify-center font-bold transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
              aria-label="Toggle Chat Sessions Sidebar"
              title="Toggle Sidebar (Chat Sessions)"
            >
              <svg className="w-5 h-5 fill-slate-950" viewBox="0 0 32 32">
                <path d="M16 3.5C14.3 3.5 13.1 5.8 12.5 8.8 11.7 12.3 8.8 15.2 5.2 15.9c-1.2.2-1.2 2 0 2.2 3.6.7 6.5 3.6 7.3 7.1.6 3 1.8 5.3 3.5 5.3s2.9-2.3 3.5-5.3c.8-3.5 3.7-6.4 7.3-7.1 1.2-.2 1.2-2 0-2.2-3.6-.7-6.5-3.6-7.3-7.1-.6-3-1.8-5.3-3.5-5.3z" />
              </svg>
            </button>

            <div className="w-8 h-px bg-slate-700/50" />

            <nav className="flex flex-col items-center gap-3.5">
              <button
                onClick={handleNewChat}
                className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all cursor-pointer"
                title="Start New Chat Session"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>

              <button
                onClick={() => (onToggleDrawer ? onToggleDrawer() : onClose?.())}
                className={"p-2.5 rounded-2xl transition-all relative cursor-pointer " + (isOpen ? "bg-slate-700 text-white border border-slate-600 shadow-sm" : "text-slate-400 hover:text-white hover:bg-slate-700/50")}
                title="Toggle Chat Sessions (PostgreSQL Checkpointer)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {sessions.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#181c26]" />
                )}
              </button>

              <button
                onClick={() => onOpenTelemetry?.()}
                className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all cursor-pointer"
                title="Live LangGraph State Machine & OTel Traces Inspector"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>

              {onSeedKnowledgeBase && (
                <button
                  onClick={handleSeedClick}
                  disabled={isSeeding}
                  className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50 cursor-pointer"
                  title="Seed Knowledge Base (3 Enterprise Docs into pgvector)"
                >
                  {isSeeding ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  )}
                </button>
              )}
            </nav>
          </div>

          <div className="flex flex-col items-center gap-3">
            <a
              href="https://github.com/rizwandev99/nexus-enterprise-knowledge-worker"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
              title="View Source Code & Architecture on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>

        {/* 2. Expandable Sessions Drawer */ }
        <aside
          className={"fixed inset-y-0 left-16 z-40 bg-[#181c26] border-r border-slate-700/50 flex flex-col overflow-hidden transition-all duration-300 ease-out md:relative md:left-0 " + (isOpen ? "translate-x-0 w-60 opacity-100" : "-translate-x-full w-60 md:w-0 md:translate-x-0 md:opacity-0")}
        >
          <div className="w-60 flex flex-col h-full">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-700/50 shrink-0 bg-[#141720]/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Chat Sessions
              </span>
              <div className="flex items-center gap-1">
                {activeChatId && onExportChat && (
                  <button
                    onClick={onExportChat}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-xs cursor-pointer"
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
                    onClick={handleDeleteAll}
                    className={"px-2 py-0.5 rounded-lg transition-all text-[11px] font-mono cursor-pointer " + (confirmDeleteAll ? "text-rose-300 bg-rose-500/20 border border-rose-500/30 animate-pulse font-medium" : "text-slate-400 hover:text-rose-400 hover:bg-slate-700/50")}
                    title={confirmDeleteAll ? "Click again to confirm delete all chats" : "Delete all chat sessions"}
                  >
                    {confirmDeleteAll ? "Confirm?" : "Clear all"}
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
                      className={"group w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs cursor-pointer transition-all " + (isActive ? "bg-slate-700 text-white font-medium border border-slate-600 shadow-sm" : "text-slate-300 hover:bg-slate-800/60")}
                    >
                      {editingId === session.id ? (
                        <input
                          autoFocus
                          className="w-full bg-transparent text-xs outline-none border-b border-white text-white"
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
                          <span className="text-slate-400 font-mono text-[10px]">#</span>
                          <span className="truncate">{session.title || "Untitled Session"}</span>
                        </div>
                      )}

                      {isHovered && editingId !== session.id && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startRename(e, session)}
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
                            title="Rename chat"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, session.id)}
                            className={"p-1 rounded-md transition-colors " + (confirmDeleteId === session.id ? "text-rose-400 bg-rose-500/20" : "text-slate-400 hover:text-rose-400 hover:bg-slate-600")}
                            title={confirmDeleteId === session.id ? "Click again to confirm delete" : "Delete chat"}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
    </>
  );
}
