"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useRef } from "react";

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat();

  const [input, setInput] = useState("");
  const [resolvedApprovals, setResolvedApprovals] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="flex h-screen bg-canvas-soft text-ink font-sans relative overflow-hidden">
      
      {/* ── Approval Modal ─────────────────────────────────────────── */}
      {pendingApproval && (
        <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas rounded-lg shadow-2xl max-w-md w-full p-xl border border-hairline">
            <div className="w-12 h-12 bg-warning-soft text-warning-deep rounded-full flex items-center justify-center mb-md">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.96px] mb-xs">Action Approval Required</h2>
            <p className="text-body mb-lg text-sm leading-relaxed">
              The AI is attempting to execute a sensitive operation. Please review and approve or reject this action.
            </p>
            <div className="bg-canvas-soft-2 p-md rounded-md border border-hairline mb-xl overflow-hidden">
              <pre className="text-body font-mono text-xs overflow-x-auto">
                {(pendingApproval.parts?.find(
                  (p: any) => p.type === "text" && p.text?.includes("__APPROVAL_REQUEST__")
                ) as any)?.text?.replace("__APPROVAL_REQUEST__\n", "")}
              </pre>
            </div>
            <div className="flex gap-sm justify-end">
              <button onClick={handleReject} className="px-sm py-xs rounded-pill border border-hairline text-ink font-medium text-sm hover:bg-canvas-soft-2 transition-colors">
                Reject
              </button>
              <button onClick={handleApprove} className="px-sm py-xs rounded-pill bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
                Approve &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar (ex-app-shell-row pattern) ─────────────────────── */}
      <aside className="w-64 bg-canvas border-r border-hairline flex flex-col shrink-0 hidden md:flex">
        <div className="h-16 flex items-center px-lg border-b border-hairline font-semibold tracking-tight text-lg">
          Nexus Workspace
        </div>
        <div className="flex-1 overflow-y-auto p-sm space-y-xs">
          <div className="text-caption-mono text-mute px-sm pt-md pb-xs uppercase tracking-wider">Chat History</div>
          <button className="w-full text-left bg-canvas-soft px-sm py-xs rounded-sm text-body-sm font-medium border-l-[3px] border-primary">
            Current Session
          </button>
        </div>
        <div className="p-md border-t border-hairline flex items-center gap-xs text-body-sm text-body">
          <div className="w-8 h-8 rounded-full bg-canvas-soft border border-hairline flex items-center justify-center">U</div>
          <span>User Account</span>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full bg-canvas-soft min-w-0">
        
        {/* Header */}
        <header className="flex h-16 items-center px-lg bg-canvas border-b border-hairline shrink-0 justify-between">
          <div className="flex items-center gap-md">
            <h1 className="text-lg font-semibold tracking-tight">Enterprise Knowledge Worker</h1>
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-mute">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Thinking…
              </div>
            )}
          </div>
          <div className="flex items-center gap-xs">
            <button className="px-xs py-[4px] rounded-sm bg-canvas text-ink text-sm font-medium border border-hairline">
              Ask AI
            </button>
            <button className="px-xs py-[4px] rounded-sm bg-primary text-on-primary text-sm font-medium">
              Share
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-lg flex flex-col">
          <div className="max-w-3xl mx-auto w-full space-y-xl">
            {messages.length === 0 && (
              <div className="text-center text-mute mt-32">
                <h2 className="text-2xl font-semibold tracking-[-0.96px] text-ink mb-xs">Welcome to Nexus</h2>
                <p className="text-body">Send a message to start querying your enterprise data.</p>
              </div>
            )}

            {messages.map((m) => {
              const textContent = (m.parts?.find((p: any) => p.type === "text") as any)?.text ?? "";

              if (textContent === "[HUMAN_APPROVAL_YES]" || textContent === "[HUMAN_APPROVAL_NO]")
                return null;

              const hasContent = textContent.trim() || m.parts?.some((p: any) => p.type === "tool-invocation");
              if (!hasContent) return null;

              return (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-lg rounded-md max-w-[85%] border border-hairline ${m.role === "user" ? "bg-primary text-on-primary" : "bg-canvas text-ink shadow-[0px_1px_1px_#00000005,0px_2px_2px_#0000000a]"}`}>
                    <div className="font-mono text-[12px] mb-sm opacity-60 uppercase tracking-wider">
                      {m.role === "user" ? "You" : "Nexus AI"}
                    </div>
                    <div className="text-[16px] leading-[24px] whitespace-pre-wrap">
                      {m.parts?.map((part: any, index: number) => {
                        if (part.type === "text") return <span key={index}>{part.text}</span>;

                        if (part.type === "tool-invocation") {
                          const isDone = part.toolInvocation?.state === "result";
                          return (
                            <div key={index} className="mt-md mb-md p-sm bg-canvas-soft border border-hairline rounded-sm flex items-center gap-sm">
                              {isDone ? (
                                <span className="text-success text-xs">✓</span>
                              ) : (
                                <div className="w-3 h-3 border-2 border-mute border-t-transparent rounded-full animate-spin" />
                              )}
                              <span className="font-mono text-xs font-medium text-body">
                                {isDone ? "Ran" : "Running"} <span className="text-link">{part.toolInvocation?.toolName}</span>{!isDone && "…"}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }) ?? <span>{textContent}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-lg bg-canvas border-t border-hairline shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <input
              className="w-full h-12 px-sm rounded-sm border border-hairline bg-canvas text-sm focus:outline-none focus:border-hairline-strong transition-colors disabled:opacity-50 pr-24 shadow-sm"
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
              className="absolute right-[4px] top-[4px] bottom-[4px] px-sm rounded-sm bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
