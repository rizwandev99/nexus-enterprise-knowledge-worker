"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  getChatSessions, 
  createChatSession, 
  deleteChatSession, 
  renameChatSession,
  deleteAllChatSessions
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
          className="fixed inset-0 bg-primary/20 z-40 md:hidden transition-opacity" 
          onClick={onClose}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-canvas border-r border-hairline flex flex-col shrink-0 overflow-hidden transition-all duration-300 md:relative md:z-auto ${
        isOpen 
          ? 'translate-x-0 w-64 opacity-100' 
          : '-translate-x-full w-64 md:w-0 md:translate-x-0 md:border-r-0 md:opacity-0 md:px-0'
      }`}>
      <div className="w-64 flex flex-col h-full text-ink">
        <div className="h-16 flex items-center px-6 border-b border-hairline font-semibold tracking-tight text-lg shrink-0">
          Nexus Workspace
        </div>
        
        <div className="p-3 shrink-0">
          <button 
            onClick={handleNewChat}
            className="w-full py-2 bg-primary text-on-primary text-sm font-medium rounded-md hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-3 pt-2 pb-2">
            <div className="font-mono text-[12px] text-mute uppercase tracking-wider">Chat History</div>
            {sessions.length > 0 && (
              <button 
                onClick={handleDeleteAll}
                className={`p-1 rounded transition-colors ${confirmDeleteAll ? 'text-error hover:bg-error-soft' : 'text-mute hover:text-error hover:bg-canvas-soft-2'}`}
                title={confirmDeleteAll ? "Click again to confirm" : "Delete All Chats"}
                aria-label="Delete all chats"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => onSelectChat(session.id)}
              className={`group w-full flex items-center justify-between text-left px-3 py-2 rounded-md text-[14px] cursor-pointer transition-colors ${
                activeChatId === session.id 
                  ? "bg-canvas-soft-2 text-ink font-medium border-l-[3px] border-primary" 
                  : "text-body hover:bg-canvas-soft"
              }`}
            >
              {editingId === session.id ? (
                <input
                  autoFocus
                  className="w-full bg-canvas border border-hairline rounded px-1 py-0.5 text-sm outline-none text-ink"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={e => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="truncate flex-1">{session.title}</span>
              )}

              {!editingId && (
                <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-2">
                  <button 
                    onClick={(e) => startRename(e, session)}
                    className="p-1 text-mute hover:text-ink rounded hover:bg-canvas-soft-2"
                    title="Rename"
                    aria-label="Rename chat"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, session.id)}
                    className={`p-1 rounded transition-colors ${confirmDeleteId === session.id ? 'text-error hover:bg-error-soft' : 'text-mute hover:text-error hover:bg-canvas-soft-2'}`}
                    title={confirmDeleteId === session.id ? "Confirm delete" : "Delete"}
                    aria-label="Delete chat"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-hairline flex items-center gap-2 text-[14px] text-body shrink-0">
          <div className="w-8 h-8 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center font-medium">U</div>
          <span>User Account</span>
        </div>
        </div>
      </aside>
    </>
  );
}
