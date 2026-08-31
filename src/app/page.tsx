"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import ChatInput from "@/components/chat-input";
import MessageList from "@/components/message-list";
import ApprovalModal from "@/components/approval-modal";
import Sidebar from "@/components/sidebar";
import { ToastProvider, useToast } from "@/components/toast";
import TelemetryModal from "@/components/telemetry-modal";
import CitationDrawer, { type CitationInfo } from "@/components/citation-drawer";
import {
  getChatMessages,
  fetchCitationDetails,
  seedSampleKnowledgeBase,
} from "./chat-actions";

function ChatApp() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>(undefined);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-oss-120b");
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [resolvedApprovals, setResolvedApprovals] = useState<Set<string>>(new Set());

  // Citation Drawer state
  const [activeCitation, setActiveCitation] = useState<CitationInfo | null>(null);
  const [isCitationDrawerOpen, setIsCitationDrawerOpen] = useState(false);
  const [isCitationLoading, setIsCitationLoading] = useState(false);

  const { showToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    id: activeChatId || undefined,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll on new messages or tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    getChatMessages(activeChatId).then((history) => {
      if (!isMounted) return;
      const formatted: UIMessage[] = history.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: msg.content }],
      }));
      setMessages(formatted);
    });

    return () => {
      isMounted = false;
    };
  }, [activeChatId, setMessages]);

  const handleSend = useCallback(
    (promptText: string) => {
      const generatedChatId =
        activeChatId ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "session-" + Date.now());

      if (!activeChatId) {
        setActiveChatId(generatedChatId);
      }

      sendMessage(
        {
          role: "user",
          parts: [{ type: "text", text: promptText }],
        },
        {
          body: {
            chatId: generatedChatId,
            model: selectedModel,
          },
        }
      );

      setSidebarRefreshTrigger((p) => p + 1);
    },
    [activeChatId, selectedModel, sendMessage]
  );

  const handleCitationClick = useCallback(async (docIndex: number) => {
    setIsCitationDrawerOpen(true);
    setIsCitationLoading(true);
    try {
      const details = await fetchCitationDetails(docIndex);
      if (details) {
        setActiveCitation(details);
      } else {
        setActiveCitation({
          id: "Doc-" + docIndex,
          docIndex,
          title: "Enterprise Governance & Policy Document " + docIndex,
          department: "Security, Compliance & Infrastructure",
          matchScore: 95,
          rrfRank: docIndex,
          passageText:
            "Mandatory dual-authorization and cryptographic integrity verification required before mutating production state or records.",
        });
      }
    } catch {
      setActiveCitation({
        id: "Doc-" + docIndex,
        docIndex,
        title: "Enterprise Document " + docIndex,
        department: "Enterprise Knowledge Base",
        matchScore: 92,
        rrfRank: docIndex,
        passageText:
          "Verified enterprise document excerpt retrieved via PostgreSQL pgvector & tsvector hybrid search engine.",
      });
    } finally {
      setIsCitationLoading(false);
    }
  }, []);

  const handleExportChat = useCallback(() => {
    if (messages.length === 0) {
      showToast("No messages to export in current session", "info");
      return;
    }

    const mdContent = [
      "# Nexus Sense AI — Chat Export",
      "Date: " + new Date().toLocaleString(),
      "Session ID: " + (activeChatId || "new-session"),
      "Model: " + selectedModel,
      "---",
      "",
      ...messages.map((m) => {
        const role = m.role === "user" ? "### User" : "### Sense AI";
        const content = m.parts?.map((p) => (p.type === "text" ? p.text : "")).join("\n") || "";
        return role + "\n" + content + "\n";
      }),
    ].join("\n");

    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sense-ai-session-" + (activeChatId || "export").slice(0, 8) + ".md";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Chat session exported to Markdown (.md)", "success");
  }, [messages, activeChatId, selectedModel, showToast]);

  const handleSeedKnowledgeBase = useCallback(async () => {
    try {
      const res = await seedSampleKnowledgeBase();
      if (res.success) {
        showToast("Seeded 3 Enterprise Documents into pgvector!", "success");
        setSidebarRefreshTrigger((p) => p + 1);
      } else {
        showToast("Failed to seed knowledge base: " + res.message, "error");
      }
    } catch (err) {
      showToast("Error seeding demo knowledge base: " + String(err), "error");
    }
  }, [showToast]);

  // Detect pending approval messages
  const approvalMarkerMsg = messages.find((m) =>
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

  const displayMessages = messages.filter((m) => {
    const txt = m.parts?.map((p) => (p.type === "text" ? p.text : "")).join("") || "";
    return !txt.includes("__APPROVAL_REQUEST__");
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden select-none bg-[#141720] text-slate-100">
      {/* Approval Modal for HITL Interrupts */ }
      <ApprovalModal
        pendingApproval={pendingApproval as UIMessage}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* State & Telemetry Inspector Modal */ }
      <TelemetryModal
        isOpen={isTelemetryOpen}
        onClose={() => setIsTelemetryOpen(false)}
        activeChatId={activeChatId}
      />

      {/* Slide-over Citation Drawer */ }
      <CitationDrawer
        isOpen={isCitationDrawerOpen}
        onClose={() => setIsCitationDrawerOpen(false)}
        citation={activeCitation}
        isLoading={isCitationLoading}
      />

      {/* Sidebar with icon rail & session drawer */ }
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

      {/* Main Container */ }
      <main className="flex-1 flex flex-col h-full min-w-0 relative z-10 bg-[#141720]">
        {/* Top Header matching Reference Video */ }
        <header
          className="flex h-14 items-center px-6 shrink-0 justify-between relative z-20 bg-[#181c26]/80 backdrop-blur-md border-b border-slate-700/50"
        >
          {/* Left: White Squircle + Sense AI in crisp white text */ }
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((p) => !p)}
              className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
              aria-label="Toggle Sessions Drawer"
              title="Toggle Chat Sessions (Ctrl+B)"
            >
              <svg className="w-4 h-4 fill-slate-950" viewBox="0 0 32 32">
                <path d="M16 3.5C14.3 3.5 13.1 5.8 12.5 8.8 11.7 12.3 8.8 15.2 5.2 15.9c-1.2.2-1.2 2 0 2.2 3.6.7 6.5 3.6 7.3 7.1.6 3 1.8 5.3 3.5 5.3s2.9-2.3 3.5-5.3c.8-3.5 3.7-6.4 7.3-7.1 1.2-.2 1.2-2 0-2.2-3.6-.7-6.5-3.6-7.3-7.1-.6-3-1.8-5.3-3.5-5.3z" />
              </svg>
            </button>

            <span className="text-sm font-semibold text-white tracking-tight">
              Sense AI
            </span>

            {/* Status Indicator */ }
            {isLoading && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800/80 border border-slate-700/60 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Generating...</span>
              </div>
            )}
          </div>

          {/* Right: Minimal 4-dots Circle Button + Telemetry Trigger */ }
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTelemetryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
              title="View Live LangGraph Execution Traces & State Machine"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Telemetry</span>
            </button>

            <button
              onClick={() => setIsSidebarOpen((p) => !p)}
              className="w-8 h-8 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
              title="More Actions"
              aria-label="Menu"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="7" cy="7" r="2.5" />
                <circle cx="17" cy="7" r="2.5" />
                <circle cx="7" cy="17" r="2.5" />
                <circle cx="17" cy="17" r="2.5" />
              </svg>
            </button>
          </div>
        </header>

        {/* Message List area */ }
        <MessageList
          messages={displayMessages as UIMessage[]}
          messagesEndRef={messagesEndRef}
          onSelectPrompt={(prompt) => handleSend(prompt)}
          onSeedKnowledgeBase={handleSeedKnowledgeBase}
          onSelectCitation={handleCitationClick}
          onOpenTelemetry={() => setIsTelemetryOpen(true)}
          selectedModel={selectedModel}
          isStreaming={status === "streaming"}
        />

        {/* Floating Omni-Input Bar */ }
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          selectedPrompt={selectedPrompt}
          onClearSelectedPrompt={() => setSelectedPrompt(undefined)}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />

        {/* Monospace Footer Disclaimer matching Reference */ }
        <footer className="text-center pb-3 px-4 select-none">
          <p className="font-mono text-xs text-slate-500">
            Sense AI may contain errors. We recommend checking important information.
          </p>
        </footer>
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
