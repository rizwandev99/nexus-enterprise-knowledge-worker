"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { getChatMessages, createChatSession } from "./chat-actions";
import Sidebar from "@/components/sidebar";
import ChatInput from "@/components/chat-input";
import MessageList from "@/components/message-list";
import ApprovalModal from "@/components/approval-modal";
import { ToastProvider, useToast } from "@/components/toast";

function ChatApp() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) setIsSidebarOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { messages, setMessages, sendMessage, status } = useChat();
  const loadedChatIdRef = useRef<string | null>(null);
  const prevStatusRef = useRef(status);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  // When streaming finishes, refresh the sidebar so auto-renamed titles appear.
  // generateChatTitle runs as a detached promise in the route and takes ~1-3 s
  // (Groq LLM round-trip) to write the new title to the DB, so we wait 3 s.
  useEffect(() => {
    if (prevStatusRef.current !== "ready" && status === "ready") {
      const timer = setTimeout(() => setSidebarRefreshTrigger((n) => n + 1), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Track the previous status in a separate effect so the comparison above
  // always sees the *previous* value, not the current one.
  useEffect(() => {
    prevStatusRef.current = status;
  });

  useEffect(() => {
    if (loadedChatIdRef.current === activeChatId) return;
    loadedChatIdRef.current = activeChatId;
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    getChatMessages(activeChatId).then((msgs: unknown) => setMessages(msgs as UIMessage[]));
  }, [activeChatId, setMessages]);

  const [resolvedApprovals, setResolvedApprovals] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const approvalMarkerMsg = [...messages].reverse().find(
    (m) => m.role === "assistant" && m.parts?.some(p => p.type === "text" && p.text?.includes("__APPROVAL_REQUEST__"))
  );

  const pendingApproval = approvalMarkerMsg && !resolvedApprovals.has(approvalMarkerMsg.id) ? approvalMarkerMsg : null;

  const handleApprove = useCallback(() => {
    if (!pendingApproval) return;
    setResolvedApprovals(p => new Set(p).add(pendingApproval.id));
    sendMessage({ role: "user", parts: [{ type: "text", text: "[HUMAN_APPROVAL_YES]" }] }, { body: { chatId: activeChatId } });
  }, [pendingApproval, activeChatId, sendMessage]);

  const handleReject = useCallback(() => {
    if (!pendingApproval) return;
    setResolvedApprovals(p => new Set(p).add(pendingApproval.id));
    sendMessage({ role: "user", parts: [{ type: "text", text: "[HUMAN_APPROVAL_NO]" }] }, { body: { chatId: activeChatId } });
  }, [pendingApproval, activeChatId, sendMessage]);

  const handleSend = useCallback(async (text: string) => {
    try {
      let currentChatId = activeChatId;
      if (!currentChatId) {
        const session = await createChatSession();
        if (!session?.id) throw new Error("Could not create chat session");
        loadedChatIdRef.current = session.id;
        setActiveChatId(session.id);
        setSidebarRefreshTrigger((n) => n + 1); // show "New Chat" entry immediately
        currentChatId = session.id;
      }
      sendMessage({ role: "user", parts: [{ type: "text", text }] }, { body: { chatId: currentChatId } });
    } catch (err: unknown) {
      showToast("Failed to send message: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  }, [activeChatId, sendMessage, showToast]);

  return (
    <div className="flex h-screen bg-canvas-soft text-ink font-sans relative overflow-hidden">
      <ApprovalModal pendingApproval={pendingApproval as UIMessage} onApprove={handleApprove} onReject={handleReject} />
      <Sidebar 
        activeChatId={activeChatId} 
        onSelectChat={(id) => { setActiveChatId(id); if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarOpen(false); }} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        refreshTrigger={sidebarRefreshTrigger}
      />
      <main className="flex-1 flex flex-col h-full bg-canvas-soft min-w-0">
        <header className="flex h-16 items-center px-6 bg-canvas border-b border-hairline shrink-0 justify-between">
          <div className="flex items-center gap-4">
            <div className="group relative flex items-center">
              <button onClick={() => setIsSidebarOpen(p => !p)} className="p-1.5 rounded-md hover:bg-canvas-soft-2 text-mute transition-colors focus:outline-none flex items-center justify-center" aria-label="Toggle Sidebar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </button>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-primary text-on-primary text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md flex items-center gap-1.5">
                Toggle Sidebar <span className="text-mute font-mono ml-1">Ctrl+B</span>
              </div>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">Enterprise Knowledge Worker</h1>
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-mute">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />Thinking…
              </div>
            )}
          </div>
        </header>
        <MessageList messages={messages as UIMessage[]} messagesEndRef={messagesEndRef} />
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default function ChatPage() {
  return <ToastProvider><ChatApp /></ToastProvider>;
}
