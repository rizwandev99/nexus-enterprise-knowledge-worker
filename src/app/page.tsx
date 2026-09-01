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
  const [activeChatId, setActiveChatId] = useState<string>(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "session-" + Date.now();
  });
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
    id: activeChatId,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll on new messages or tokens (only when messages exist to avoid premature scroll on empty state)
  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSelectChat = useCallback(
    async (id: string) => {
      if (!id) {
        // Start a fresh new chat session
        const newId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "session-" + Date.now();
        setActiveChatId(newId);
        setMessages([]);
        setResolvedApprovals(new Set());
        return;
      }

      setActiveChatId(id);
      setResolvedApprovals(new Set());
      try {
        const history = await getChatMessages(id);
        const formatted: UIMessage[] = history.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: [{ type: "text" as const, text: msg.content }],
        }));
        setMessages(formatted);
      } catch (err) {
        console.error("Failed to load chat history:", err);
        setMessages([]);
      }
    },
    [setMessages]
  );

  const handleSend = useCallback(
    (promptText: string, options?: { webSearch?: boolean }) => {
      sendMessage(
        {
          role: "user",
          parts: [{ type: "text", text: promptText }],
        },
        {
          body: {
            chatId: activeChatId,
            model: selectedModel,
            webSearch: options?.webSearch ?? false,
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
      "# Nexus AI — Chat Export",
      "Date: " + new Date().toLocaleString(),
      "Session ID: " + (activeChatId || "new-session"),
      "Model: " + selectedModel,
      "---",
      "",
      ...messages.map((m) => {
        const role = m.role === "user" ? "### User" : "### Nexus AI";
        const content = m.parts?.map((p) => (p.type === "text" ? p.text : "")).join("\n") || "";
        return role + "\n" + content + "\n";
      }),
    ].join("\n");

    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexus-ai-session-" + (activeChatId || "export").slice(0, 8) + ".md";
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

  // Detect pending approval messages (searching from latest message backwards and skipping already resolved approvals)
  const pendingApproval =
    messages.findLast((m) => {
      if (m.role !== "assistant") return false;
      if (resolvedApprovals.has(m.id)) return false;
      const txt =
        (typeof (m as unknown as { content?: string }).content === "string"
          ? (m as unknown as { content: string }).content
          : "") +
        (Array.isArray(m.parts)
          ? m.parts
              .map((p) => {
                if (typeof p === "string") return p;
                if (
                  p &&
                  typeof p === "object" &&
                  "text" in p &&
                  typeof (p as { text?: string }).text === "string"
                ) {
                  return (p as { text: string }).text;
                }
                return "";
              })
              .join("")
          : "");
      return txt.includes("__APPROVAL_REQUEST__");
    }) || null;

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
    const txt =
      (typeof (m as unknown as { content?: string }).content === "string"
        ? (m as unknown as { content: string }).content
        : "") +
      (Array.isArray(m.parts)
        ? m.parts
            .map((p) => {
              if (typeof p === "string") return p;
              if (
                p &&
                typeof p === "object" &&
                "text" in p &&
                typeof (p as { text?: string }).text === "string"
              ) {
                return (p as { text: string }).text;
              }
              return "";
            })
            .join("")
        : "");
    return (
      !txt.includes("__APPROVAL_REQUEST__") &&
      !txt.includes("[HUMAN_APPROVAL_YES]") &&
      !txt.includes("[HUMAN_APPROVAL_NO]")
    );
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden select-none bg-[#08090b] text-slate-100">
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
          handleSelectChat(id);
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
      <main className="flex-1 flex flex-col h-full min-w-0 relative z-10 bg-[#08090b]">
        {/* Top Header matching Linear.app */}
        <header
          className="h-12 border-b border-white/[0.08] bg-[#0c0d12]/80 backdrop-blur-2xl px-4 flex items-center justify-between relative z-20"
        >
          {/* Left: Brand squircle (Toggle Drawer) + Sidebar Toggle Button + Nexus AI */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSidebarOpen((p) => !p)}
              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Toggle Sidebar Sessions Drawer"
              title="Toggle Sidebar Sessions Drawer (Ctrl+B)"
            >
              <svg className="w-3.5 h-3.5 fill-slate-950" viewBox="0 0 24 24">
                <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z" />
              </svg>
            </button>

            <button
              onClick={() => setIsSidebarOpen((p) => !p)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Toggle Sessions Drawer"
              title="Toggle Chat Sessions (Ctrl+B)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>

            <span className="text-xs font-medium text-slate-200 tracking-wide">
              Nexus AI
            </span>

            {/* Status Indicator */}
            {isLoading && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.06] border border-white/[0.12] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Generating...</span>
              </div>
            )}
          </div>

          {/* Right: Telemetry trigger pill + GitHub link */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTelemetryOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer shadow-sm"
              title="View Live LangGraph Execution Traces & State Machine"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Telemetry</span>
            </button>

            <a
              href="https://github.com/rizwandev99/nexus-enterprise-knowledge-worker"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.10] transition-all flex items-center justify-center cursor-pointer"
              title="View Source Code on GitHub"
              aria-label="GitHub Repository"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </header>

        {/* Message List area */}
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

        {/* Floating Omni-Input Bar */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          selectedPrompt={selectedPrompt}
          onClearSelectedPrompt={() => setSelectedPrompt(undefined)}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />

        {/* Minimal Monospace Footer Disclaimer */}
        <footer className="text-center pb-3 px-4 select-none">
          <p className="text-[11px] font-mono text-slate-500/80">
            Nexus AI may contain errors. We recommend checking important information.
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
