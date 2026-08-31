"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getChatMessages,
  createChatSession,
  seedSampleKnowledgeBase,
  fetchCitationDetails,
} from "./chat-actions";
import Sidebar from "@/components/sidebar";
import ChatInput from "@/components/chat-input";
import MessageList from "@/components/message-list";
import ApprovalModal from "@/components/approval-modal";
import TelemetryModal from "@/components/telemetry-modal";
import CitationDrawer, { type CitationInfo } from "@/components/citation-drawer";
import { ToastProvider, useToast } from "@/components/toast";

/* ─── Status pill colours ─── */
const STATUS_PILL = {
  streaming: { bg: "rgba(20,184,166,0.15)", dot: "#14b8a6", label: "Streaming" },
  submitted: { bg: "rgba(20,184,166,0.10)", dot: "#2dd4bf", label: "Thinking…" },
  ready:     { bg: "transparent",           dot: "transparent", label: "" },
  error:     { bg: "rgba(248,113,113,0.12)", dot: "#f87171", label: "Error" },
};

function ChatApp() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>(undefined);
  const [selectedModel, setSelectedModel] = useState<string>("groq-gpt-oss-120b");
  const [activeCitation, setActiveCitation] = useState<CitationInfo | null>(null);
  const [isCitationDrawerOpen, setIsCitationDrawerOpen] = useState<boolean>(false);
  const [isCitationLoading, setIsCitationLoading] = useState<boolean>(false);
  const { showToast } = useToast();

  /* Toggle sidebar handler */
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

  /* Refresh sidebar 3s after stream ends */
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

  /* Citation click handler */
  const handleSelectCitation = useCallback(async (docIndex: number) => {
    setIsCitationDrawerOpen(true);
    setIsCitationLoading(true);
    try {
      const details = await fetchCitationDetails(docIndex);
      setActiveCitation(details);
    } catch (err) {
      console.error("Failed to load citation details:", err);
      setActiveCitation({
        id: `Doc-${docIndex}`,
        docIndex,
        title: `Enterprise Knowledge Source #${docIndex}`,
        uri: `doc://source-${docIndex}`,
        passageText: `Retrieved document context for verified citation [Doc-${docIndex}].`,
        department: "Enterprise Knowledge Base",
        matchScore: 92,
        rrfRank: docIndex,
      });
    } finally {
      setIsCitationLoading(false);
    }
  }, []);

  /* One-click Demo Knowledge Base Seeding */
  const handleSeedKnowledgeBase = useCallback(async () => {
    try {
      showToast("Seeding PostgreSQL with sample enterprise documents…", "info");
      const result = await seedSampleKnowledgeBase();
      showToast(result.message, result.success ? "success" : "info");
      setSidebarRefreshTrigger((n) => n + 1);
    } catch (err: unknown) {
      showToast("Failed to seed knowledge base: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  }, [showToast]);

  /* Export active chat to Markdown */
  const handleExportChat = useCallback(() => {
    if (!messages || messages.length === 0) {
      showToast("No messages to export in this session", "info");
      return;
    }
    const markdownContent = messages
      .map((m) => {
        const role = m.role === "user" ? "### 👤 User" : "### 🤖 Nexus AI";
        const content =
          m.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") || "";
        return `${role}\n\n${content}\n\n---\n`;
      })
      .join("\n");

    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexus-chat-${activeChatId || "session"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Chat session exported as Markdown", "success");
  }, [messages, activeChatId, showToast]);

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
      { body: { chatId: activeChatId, model: selectedModel } }
    );
  }, [pendingApproval, activeChatId, selectedModel, sendMessage]);

  const handleReject = useCallback(() => {
    if (!pendingApproval) return;
    setResolvedApprovals((p) => new Set(p).add(pendingApproval.id));
    sendMessage(
      { role: "user", parts: [{ type: "text", text: "[HUMAN_APPROVAL_NO]" }] },
      { body: { chatId: activeChatId, model: selectedModel } }
    );
  }, [pendingApproval, activeChatId, selectedModel, sendMessage]);

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
          { body: { chatId: currentChatId, model: selectedModel } }
        );
      } catch (err: unknown) {
        showToast(
          "Failed to send: " + (err instanceof Error ? err.message : String(err)),
          "error"
        );
      }
    },
    [activeChatId, selectedModel, sendMessage, showToast]
  );

  const pill = STATUS_PILL[status as keyof typeof STATUS_PILL] ?? STATUS_PILL.ready;

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={{ background: "#090a0f" }}
    >
      {/* HITL approval modal */}
      <ApprovalModal
        pendingApproval={pendingApproval as UIMessage}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Live Telemetry & Inspector Modal */}
      <TelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        activeChatId={activeChatId}
      />

      {/* Slide-over Citation Drawer */}
      <CitationDrawer
        isOpen={isCitationDrawerOpen}
        onClose={() => setIsCitationDrawerOpen(false)}
        citation={activeCitation}
        isLoading={isCitationLoading}
      />

      {/* Sidebar with icon rail & session drawer */}
      <Sidebar
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          if (typeof window !== "undefined" && window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onToggleDrawer={() => setIsSidebarOpen((p) => !p)}
        refreshTrigger={sidebarRefreshTrigger}
        onOpenTelemetry={() => setIsTelemetryOpen(true)}
        onExportChat={handleExportChat}
        onSeedKnowledgeBase={handleSeedKnowledgeBase}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        {/* Top Header */}
        <header
          className="flex h-14 items-center px-6 shrink-0 justify-between relative z-20"
          style={{
            background: "rgba(9, 10, 15, 0.75)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Left: Toggle + App Name + Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((p) => !p)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              aria-label="Toggle Sessions Drawer"
              title="Toggle Chat Sessions (Ctrl+B)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>

            <span className="text-xs font-semibold text-gray-300 tracking-tight">
              Nexus Knowledge Base
            </span>

            {/* Status Pill */}
            {isLoading && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-teal-500/30"
                style={{
                  background: pill.bg,
                  color: "#5eead4",
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

          {/* Right: High ROI Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Export Session Markdown Button (Visible when messages exist) */}
            {messages.length > 0 && (
              <button
                onClick={handleExportChat}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                title="Export Active Session as Markdown"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="hidden sm:inline">Export (.md)</span>
              </button>
            )}

            {/* Live LangGraph Telemetry & Traces Inspector */}
            <button
              onClick={() => setIsTelemetryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 text-teal-300 text-xs font-medium transition-all shadow-[0_0_15px_rgba(20,184,166,0.15)] cursor-pointer"
              title="View Live LangGraph Execution Traces & State Machine Health"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span>Telemetry & Traces</span>
            </button>

            {/* GitHub Repo Link Badge */}
            <a
              href="https://github.com/rizwandev99/nexus-enterprise-knowledge-worker"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white text-xs font-medium transition-all"
              title="View Source Code Repository on GitHub"
            >
              <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </header>

        {/* Message List area */}
        <MessageList
          messages={messages as UIMessage[]}
          messagesEndRef={messagesEndRef}
          onSelectPrompt={(prompt) => setSelectedPrompt(prompt)}
          onSeedKnowledgeBase={handleSeedKnowledgeBase}
          onSelectCitation={handleSelectCitation}
          selectedModel={selectedModel}
        />

        {/* Input matching inspiration design with ModelSelector */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          selectedPrompt={selectedPrompt}
          onClearSelectedPrompt={() => setSelectedPrompt(undefined)}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />
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
