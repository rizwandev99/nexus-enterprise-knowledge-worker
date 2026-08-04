"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef } from "react";
import { seedDummyData } from "./actions";
import { getChatMessages, createChatSession } from "./chat-actions";
import Sidebar from "@/components/sidebar";

export default function ChatPage() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const chatHelpers: any = useChat();
  const { messages, setMessages, sendMessage, status } = chatHelpers;

  useEffect(() => {
    if (activeChatId) {
      getChatMessages(activeChatId).then((msgs: any) => {
        setMessages(msgs);
      });
    } else {
      setMessages([]);
    }
  }, [activeChatId, setMessages]);

  const [input, setInput] = useState("");
  const [resolvedApprovals, setResolvedApprovals] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isSeeding, setIsSeeding] = useState(false);

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const approvalMarkerMsg = [...messages]
    .reverse()
    .find(
      (m) =>
        m.role === "assistant" &&
        m.parts?.some(
          (p: any) => p.type === "text" && p.text?.includes("__APPROVAL_REQUEST__")
        )
    );

  const approvalId = approvalMarkerMsg?.id ?? null;
  const pendingApproval =
    approvalMarkerMsg && approvalId && !resolvedApprovals.has(approvalId)
      ? approvalMarkerMsg
      : null;

  const handleApprove = async () => {
    if (!pendingApproval || !approvalId) return;
    setResolvedApprovals((prev) => new Set(prev).add(approvalId));
    sendMessage({ text: "[HUMAN_APPROVAL_YES]" });
  };

  const handleReject = async () => {
    if (!pendingApproval || !approvalId) return;
    setResolvedApprovals((prev) => new Set(prev).add(approvalId));
    sendMessage({ text: "[HUMAN_APPROVAL_NO]" });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    
    let currentChatId = activeChatId;
    if (!currentChatId) {
      const session = await createChatSession();
      setActiveChatId(session.id);
      currentChatId = session.id;
    }
    
    sendMessage({ text }, { body: { chatId: currentChatId } });
  };

  return (
    <div className="flex h-screen bg-neutral-50 text-neutral-900 font-sans relative overflow-hidden">
      
      {/* ── Approval Modal ─────────────────────────────────────────── */}
      {pendingApproval && (
        <div className="absolute inset-0 bg-[#171717]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 border border-neutral-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">Action Approval Required</h2>
            <p className="text-neutral-600 mb-6 text-sm leading-relaxed">
              The AI is attempting to execute a sensitive operation. Please review and approve or reject this action.
            </p>
            <div className="bg-neutral-100 p-4 rounded-md border border-neutral-200 mb-8 overflow-hidden">
              <pre className="text-neutral-600 font-mono text-xs overflow-x-auto">
                {(pendingApproval.parts?.find(
                  (p: any) => p.type === "text" && p.text?.includes("__APPROVAL_REQUEST__")
                ) as any)?.text?.replace("__APPROVAL_REQUEST__\n", "")}
              </pre>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={handleReject} className="px-4 py-2 rounded-full border border-neutral-200 text-neutral-900 font-medium text-sm hover:bg-neutral-100 transition-colors">
                Reject
              </button>
              <button onClick={handleApprove} className="px-4 py-2 rounded-full bg-[#171717] text-white font-medium text-sm hover:opacity-90 transition-opacity">
                Approve &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ─────────────────────── */}
      <Sidebar activeChatId={activeChatId} onSelectChat={setActiveChatId} />

      {/* ── Main Content Area ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-neutral-50 min-w-0">
        
        {/* Header */}
        <header className="flex h-16 items-center px-6 bg-white border-b border-neutral-200 shrink-0 justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-tight">Enterprise Knowledge Worker</h1>
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Thinking…
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                setIsSeeding(true);
                await seedDummyData();
                setIsSeeding(false);
                alert("Dummy data seeded successfully!");
              }}
              disabled={isSeeding}
              className="px-3 py-1.5 rounded-sm bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200 disabled:opacity-50"
            >
              {isSeeding ? "Seeding..." : "Seed Data"}
            </button>
            <button className="px-3 py-1.5 rounded-sm bg-white text-neutral-900 text-sm font-medium border border-neutral-200">
              Ask AI
            </button>
            <button className="px-3 py-1.5 rounded-sm bg-[#171717] text-white text-sm font-medium">
              Share
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          <div className="max-w-3xl mx-auto w-full space-y-8">
            {messages.length === 0 && (
              <div className="text-center text-neutral-400 mt-32">
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-2">Welcome to Nexus</h2>
                <p className="text-[16px] text-neutral-600">Send a message to start querying your enterprise data.</p>
              </div>
            )}

            {messages.map((m: any) => {
              const textContent = m.parts 
                ? (m.parts.find((p: any) => p.type === "text") as any)?.text ?? "" 
                : m.content ?? "";

              if (
                textContent === "[HUMAN_APPROVAL_YES]" || 
                textContent === "[HUMAN_APPROVAL_NO]" ||
                textContent.includes("__APPROVAL_REQUEST__")
              ) {
                return null;
              }

              const hasContent = textContent.trim() || m.parts?.some((p: any) => p.type === "tool-invocation");
              if (!hasContent) return null;

              return (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-6 rounded-lg max-w-[85%] border border-neutral-200 ${m.role === "user" ? "bg-[#171717] text-white" : "bg-white text-neutral-900 shadow-sm"}`}>
                    <div className="font-mono text-[12px] mb-3 opacity-60 uppercase tracking-wider">
                      {m.role === "user" ? "You" : "Nexus AI"}
                    </div>
                    <div className="text-[16px] leading-[24px] whitespace-pre-wrap">
                      {m.parts ? m.parts.map((part: any, index: number) => {
                        if (part.type === "text") return <span key={index}>{part.text}</span>;

                        if (part.type === "tool-invocation") {
                          const isDone = part.toolInvocation?.state === "result";
                          return (
                            <div key={index} className="mt-4 mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded-md flex items-center gap-3">
                              {isDone ? (
                                <span className="text-emerald-600 text-xs font-bold">✓</span>
                              ) : (
                                <div className="w-3 h-3 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                              )}
                              <span className="font-mono text-xs font-medium text-neutral-600">
                                {isDone ? "Ran" : "Running"} <span className="text-blue-600 font-semibold">{part.toolInvocation?.toolName}</span>{!isDone && "…"}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }) : <span>{m.content}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-white border-t border-neutral-200 shrink-0">
          <div className="max-w-3xl mx-auto relative w-full flex items-center">
            <input
              className="w-full h-12 px-4 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:border-neutral-400 transition-colors disabled:opacity-50 pr-24 shadow-sm"
              value={input}
              placeholder="Ask a question about your enterprise data..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-1 top-1 bottom-1 px-4 rounded-md bg-[#171717] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
