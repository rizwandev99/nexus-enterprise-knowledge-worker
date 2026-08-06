"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { getChatMessages, createChatSession } from "./chat-actions";
import Sidebar from "@/components/sidebar";
import ChatInput from "@/components/chat-input";
import MessageList from "@/components/message-list";
import ApprovalModal from "@/components/approval-modal";
import { ToastProvider, useToast } from "@/components/toast";

/* ─── Status pill colours ─── */
const STATUS_PILL = {
  streaming: { bg: "rgba(99,102,241,0.15)", dot: "#6366f1", label: "Streaming" },
  submitted: { bg: "rgba(99,102,241,0.10)", dot: "#818cf8", label: "Thinking…" },
  ready:     { bg: "transparent",           dot: "transparent", label: "" },
  error:     { bg: "rgba(248,113,113,0.12)", dot: "#f87171", label: "Error" },
};

function ChatApp() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { showToast } = useToast();

  /* Open sidebar on desktop by default */
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) setIsSidebarOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { messages, setMessages, sendMessage, status } = useChat();
  const loadedChatIdRef = useRef<string | null>(null);
  const prevStatusRef = useRef(status);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

  /* Refresh sidebar 3 s after stream ends (title generation delay) */
  useEffect(() => {
    if (prevStatusRef.current !== "ready" && status === "ready") {
      const t = setTimeout(() => setSidebarRefreshTrigger((n) => n + 1), 3000);
      return () => clearTimeout(t);
    }
  }, [status]);
  useEffect(() => { prevStatusRef.current = status; });

  /* Load messages when active chat changes */
  useEffect(() => {
    if (loadedChatIdRef.current === activeChatId) return;
    loadedChatIdRef.current = activeChatId;
    if (!activeChatId) { setMessages([]); return; }
    getChatMessages(activeChatId).then((msgs: unknown) => setMessages(msgs as UIMessage[]));
  }, [activeChatId, setMessages]);

  const [resolvedApprovals, setResolvedApprovals] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* HITL approval detection */
  const approvalMarkerMsg = [...messages].reverse().find(
    (m) =>
      m.role === "assistant" &&
      m.parts?.some((p) => p.type === "text" && (p as { type: "text"; text: string }).text?.includes("__APPROVAL_REQUEST__"))
  );
  const pendingApproval =
    approvalMarkerMsg && !resolvedApprovals.has(approvalMarkerMsg.id)
      ? approvalMarkerMsg
      : null;

  const handleApprove = useCallback(() => {
    if (!pendingApproval) return;
    setResolvedApprovals((p) => new Set(p).add(pendingApproval.id));
    sendMessage(
      { role: "user", parts: [{ type: "text", text: "[HUMAN_APPROVAL_YES]" }] },
      { body: { chatId: activeChatId } }
    );
  }, [pendingApproval, activeChatId, sendMessage]);

  const handleReject = useCallback(() => {
    if (!pendingApproval) return;
    setResolvedApprovals((p) => new Set(p).add(pendingApproval.id));
    sendMessage(
      { role: "user", parts: [{ type: "text", text: "[HUMAN_APPROVAL_NO]" }] },
      { body: { chatId: activeChatId } }
    );
  }, [pendingApproval, activeChatId, sendMessage]);

  const handleSend = useCallback(
    async (text: string) => {
      try {
        let currentChatId = activeChatId;
        if (!currentChatId) {
          const session = await createChatSession();
          if (!session?.id) throw new Error("Could not create chat session");
          loadedChatIdRef.current = session.id;
          setActiveChatId(session.id);
          setSidebarRefreshTrigger((n) => n + 1);
          currentChatId = session.id;
        }
        sendMessage(
          { role: "user", parts: [{ type: "text", text }] },
          { body: { chatId: currentChatId } }
        );
      } catch (err: unknown) {
        showToast(
          "Failed to send: " + (err instanceof Error ? err.message : String(err)),
          "error"
        );
      }
    },
    [activeChatId, sendMessage, showToast]
  );

  const pill = STATUS_PILL[status as keyof typeof STATUS_PILL] ?? STATUS_PILL.ready;

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={{ background: "var(--color-base)" }}
    >
      {/* Ambient glows */}
      <div className="ambient-glow ambient-glow-tl" />
      <div className="ambient-glow ambient-glow-br" />

      {/* HITL modal */}
      <ApprovalModal
        pendingApproval={pendingApproval as UIMessage}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Sidebar */}
      <Sidebar
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          if (typeof window !== "undefined" && window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        refreshTrigger={sidebarRefreshTrigger}
      />

      {/* Main area */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        {/* Top bar */}
        <header
          className="flex h-14 items-center px-4 shrink-0 justify-between"
          style={{
            background: "rgba(10,10,15,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {/* Left: toggle + title */}
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <div className="group relative">
              <button
                onClick={() => setIsSidebarOpen((p) => !p)}
                className="p-1.5 rounded-lg transition-all duration-150 hover:opacity-80 active:scale-95"
                style={{
                  color: "var(--color-text-muted)",
                  background: "transparent",
                }}
                aria-label="Toggle Sidebar"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </button>
              {/* Tooltip */}
              <div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border-strong)",
                  color: "var(--color-text-secondary)",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                Sidebar
                <span className="ml-1.5 font-mono opacity-60">⌘B</span>
              </div>
            </div>

            {/* Divider */}
            <div
              className="h-5 w-px"
              style={{ background: "var(--color-border-strong)" }}
            />

            {/* Title */}
            <div className="flex items-center gap-2">
              <h1
                className="text-sm font-semibold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {activeChatId ? "Chat" : "Enterprise Knowledge Worker"}
              </h1>

              {/* Status pill */}
              {isLoading && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    background: pill.bg,
                    color: "var(--color-brand-hover)",
                    border: "1px solid rgba(99,102,241,0.25)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: pill.dot }}
                  />
                  {pill.label}
                </div>
              )}
            </div>
          </div>

          {/* Right: message count */}
          {messages.length > 0 && (
            <div
              className="text-[11px] font-mono"
              style={{ color: "var(--color-text-muted)" }}
            >
              {messages.length} msg{messages.length !== 1 ? "s" : ""}
            </div>
          )}
        </header>

        {/* Messages */}
        <MessageList messages={messages as UIMessage[]} messagesEndRef={messagesEndRef} />

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ToastProvider>
      <ChatApp />
    </ToastProvider>
  );
}
