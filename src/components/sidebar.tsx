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
  refreshTrigger = 0,
}: {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  refreshTrigger?: number;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "chat" | "mail" | "history">("home");
  const { showToast } = useToast();

  const loadSessions = useCallback(async () => {
    try {
      const data = await getChatSessions();
      setSessions(data);
    } catch {
      showToast("Failed to load sessions", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, activeChatId, refreshTrigger]);

  const handleNewChat = () => {
    onSelectChat("");
    setActiveTab("chat");
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
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Main Container consisting of Left Icon Rail + Expandable Sessions Drawer */}
      <div className="flex h-full shrink-0 z-40">
        {/* 1. Left Vertical Icon Rail (Exact visual layout from inspiration image) */}
        <div
          className="w-16 h-full flex flex-col items-center justify-between py-5 shrink-0 border-r border-white/5"
          style={{ background: "#0c0d12" }}
        >
          {/* Top Logo Badge (Teal square with arrow from screenshot) */}
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={handleNewChat}
              className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(20,184,166,0.4)]"
              title="Nexus Knowledge Base — New Chat"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </button>

            {/* Navigation Icon Stack */}
            <nav className="flex flex-col items-center gap-4">
              {/* Home Icon */}
              <button
                onClick={() => { setActiveTab("home"); onSelectChat(""); }}
                className={`p-2.5 rounded-xl transition-all ${
                  activeTab === "home" && !activeChatId
                    ? "bg-white/10 text-teal-400 border border-teal-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                title="Home Dashboard"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>

              {/* Chat Icon */}
              <button
                onClick={handleNewChat}
                className={`p-2.5 rounded-xl transition-all ${
                  activeTab === "chat"
                    ? "bg-white/10 text-teal-400 border border-teal-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                title="New Chat Session"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              {/* History / Sessions Icon */}
              <button
                onClick={() => setActiveTab(activeTab === "history" ? "home" : "history")}
                className={`p-2.5 rounded-xl transition-all relative ${
                  activeTab === "history" || activeChatId
                    ? "bg-white/10 text-teal-400 border border-teal-500/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
                title="Chat History Sessions"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {sessions.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400" />
                )}
              </button>
            </nav>
          </div>

          {/* Bottom Settings & Graph Nodes Stack */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => showToast("LangGraph cyclic agent machine active", "info")}
              className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              title="LangGraph Graph Inspector"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
            <button
              onClick={() => showToast("Nexus Enterprise Knowledge Worker v1.0", "info")}
              className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. Expandable Sessions Drawer */}
        <aside
          className={`fixed inset-y-0 left-16 z-40 bg-[#11131a] border-r border-white/5 flex flex-col overflow-hidden transition-all duration-300 ease-out md:relative md:left-0 ${
            isOpen
              ? "translate-x-0 w-60 opacity-100"
              : "-translate-x-full w-60 md:w-0 md:translate-x-0 md:opacity-0"
          }`}
        >
          <div className="w-60 flex flex-col h-full">
            {/* Header */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-mono">
                Chat Sessions
              </span>
              {sessions.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors text-xs"
                  title="Delete All"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Session items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">
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
                      className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                        isActive
                          ? "bg-teal-500/10 text-teal-300 font-medium border border-teal-500/20"
                          : "text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      {editingId === session.id ? (
                        <input
                          autoFocus
                          className="w-full bg-transparent text-xs outline-none border-b border-teal-400 text-white"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={saveRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate flex-1">{session.title}</span>
                      )}

                      {!editingId && (isActive || isHovered) && (
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            onClick={(e) => startRename(e, session)}
                            className="p-1 text-gray-400 hover:text-white"
                            title="Rename"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, session.id)}
                            className="p-1 text-gray-400 hover:text-red-400"
                            title="Delete"
                          >
                            🗑️
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
