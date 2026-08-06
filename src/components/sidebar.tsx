"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getChatSessions,
  createChatSession,
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

  const handleNewChat = () => onSelectChat("");

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
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-out md:relative md:z-auto ${
          isOpen
            ? "translate-x-0 w-60 opacity-100"
            : "-translate-x-full w-60 md:w-0 md:translate-x-0 md:opacity-0"
        }`}
        style={{
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <div className="w-60 flex flex-col h-full">
          {/* Logo / wordmark */}
          <div
            className="h-14 flex items-center px-5 shrink-0"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                  color: "#fff",
                  boxShadow: "0 0 10px var(--color-brand-glow)",
                }}
              >
                N
              </div>
              <span
                className="text-sm font-semibold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                Nexus
              </span>
            </div>
          </div>

          {/* New Chat button */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "var(--color-brand-muted)",
                color: "var(--color-brand-hover)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {/* Label row */}
            <div className="flex items-center justify-between px-2 pt-3 pb-1.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}
              >
                Chats
              </span>
              {sessions.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="p-1 rounded-md transition-all duration-150"
                  style={{
                    color: confirmDeleteAll ? "var(--color-error)" : "var(--color-text-muted)",
                    background: confirmDeleteAll ? "var(--color-error-muted)" : "transparent",
                  }}
                  title={confirmDeleteAll ? "Click to confirm delete all" : "Delete all chats"}
                  aria-label="Delete all chats"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {sessions.map((session) => {
                const isActive = activeChatId === session.id;
                const isHovered = hoveredId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectChat(session.id)}
                    onMouseEnter={() => setHoveredId(session.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all duration-100 relative"
                    style={{
                      background: isActive
                        ? "var(--color-brand-muted)"
                        : isHovered
                        ? "var(--color-surface-3)"
                        : "transparent",
                      color: isActive ? "var(--color-brand-hover)" : "var(--color-text-secondary)",
                    }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full"
                        style={{ background: "var(--color-brand)" }}
                      />
                    )}

                    {editingId === session.id ? (
                      <input
                        autoFocus
                        className="w-full bg-transparent text-sm outline-none border-b"
                        style={{
                          color: "var(--color-text-primary)",
                          borderBottomColor: "var(--color-border-focus)",
                          fontFamily: "var(--font-sans)",
                        }}
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
                      <span className="truncate flex-1 leading-snug">{session.title}</span>
                    )}

                    {/* Action icons */}
                    {!editingId && (isActive || isHovered) && (
                      <div className="flex items-center gap-0.5 shrink-0 ml-1">
                        <button
                          onClick={(e) => startRename(e, session)}
                          className="p-1 rounded transition-opacity opacity-50 hover:opacity-100"
                          title="Rename"
                          aria-label="Rename chat"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, session.id)}
                          className="p-1 rounded transition-all"
                          title={confirmDeleteId === session.id ? "Confirm delete" : "Delete"}
                          aria-label="Delete chat"
                          style={{
                            color: confirmDeleteId === session.id ? "var(--color-error)" : "var(--color-text-secondary)",
                            opacity: confirmDeleteId === session.id ? 1 : 0.5,
                          }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-4 py-3 shrink-0 flex items-center gap-3"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{
                background: "var(--color-surface-3)",
                border: "1px solid var(--color-border-strong)",
                color: "var(--color-text-secondary)",
              }}
            >
              U
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                User Account
              </div>
              <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Enterprise plan
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
