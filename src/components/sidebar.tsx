"use client";

import { useEffect, useState } from "react";
import { 
  getChatSessions, 
  createChatSession, 
  deleteChatSession, 
  renameChatSession 
} from "../app/chat-actions";

type ChatSession = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export default function Sidebar({
  activeChatId,
  onSelectChat,
}: {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadSessions = async () => {
    const data = await getChatSessions();
    setSessions(data);
  };

  useEffect(() => {
    loadSessions();
    
    // Poll for updates occasionally (e.g. for auto-naming)
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [activeChatId]);

  const handleNewChat = () => {
    onSelectChat("");
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      await deleteChatSession(id);
      await loadSessions();
      if (activeChatId === id) {
        onSelectChat("");
      }
    }
  };

  const startRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameChatSession(editingId, editTitle.trim());
      await loadSessions();
    }
    setEditingId(null);
  };

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shrink-0 hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-neutral-200 font-semibold tracking-tight text-lg shrink-0">
        Nexus Workspace
      </div>
      
      <div className="p-3 shrink-0">
        <button 
          onClick={handleNewChat}
          className="w-full py-2 bg-[#171717] text-white text-sm font-medium rounded-md hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="font-mono text-[12px] text-neutral-400 px-3 pt-2 pb-2 uppercase tracking-wider">Chat History</div>
        
        {sessions.map(session => (
          <div 
            key={session.id}
            onClick={() => onSelectChat(session.id)}
            className={`group w-full flex items-center justify-between text-left px-3 py-2 rounded-md text-[14px] cursor-pointer transition-colors ${
              activeChatId === session.id 
                ? "bg-neutral-100 text-neutral-900 font-medium border-l-[3px] border-[#171717]" 
                : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {editingId === session.id ? (
              <input
                autoFocus
                className="w-full bg-white border border-neutral-300 rounded px-1 py-0.5 text-sm outline-none"
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
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200"
                  title="Rename"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={(e) => handleDelete(e, session.id)}
                  className="p-1 text-neutral-400 hover:text-red-600 rounded hover:bg-neutral-200"
                  title="Delete"
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
      
      <div className="p-4 border-t border-neutral-200 flex items-center gap-2 text-[14px] text-neutral-600 shrink-0">
        <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center font-medium">U</div>
        <span>User Account</span>
      </div>
    </aside>
  );
}
