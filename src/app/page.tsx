"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export default function ChatPage() {
  const { messages, sendMessage } = useChat();
  const [input, setInput] = useState("");
  
  // Track which tool calls we've already approved/rejected so the modal disappears
  const [resolvedApprovals, setResolvedApprovals] = useState<Set<string>>(new Set());

  // Find the most recent approval request hidden in the messages
  const approvalRequests = messages.map(m => {
     const text = (m.parts?.find((p: any) => p.type === 'text') as any)?.text || "";
     if (text.startsWith("[APPROVAL_REQUEST]")) {
        try {
          return JSON.parse(text.replace("[APPROVAL_REQUEST]", ""));
        } catch (e) { return null; }
     }
     return null;
  }).filter(Boolean);
  
  const latestApproval = approvalRequests[approvalRequests.length - 1];

  // Show the modal if we have a request we haven't resolved yet
  const pendingApproval = latestApproval && !resolvedApprovals.has(latestApproval.id) 
    ? latestApproval 
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || pendingApproval) return;
    sendMessage({ role: 'user', parts: [{ type: 'text', text: input }] });
    setInput("");
  };

  const handleApprove = () => {
    if (!pendingApproval) return;
    setResolvedApprovals(prev => new Set(prev).add(pendingApproval.id));
    sendMessage({ role: 'user', parts: [{ type: 'text', text: '[HUMAN_APPROVAL_YES]' }] });
  };

  const handleReject = () => {
    if (!pendingApproval) return;
    setResolvedApprovals(prev => new Set(prev).add(pendingApproval.id));
    sendMessage({ role: 'user', parts: [{ type: 'text', text: '[HUMAN_APPROVAL_NO]' }] });
  };

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] text-[#171717] font-sans relative">
      
      {/* Approval Modal (Displays over the chat if pendingApproval exists) */}
      {pendingApproval && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#ebebeb] animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Action Approval Required</h2>
            <p className="text-[#666] mb-5 text-sm leading-relaxed">
              The AI is attempting to execute a sensitive operation. Please review the details below and approve or reject this action.
            </p>
            <div className="bg-[#fafafa] p-4 rounded-xl border border-[#ebebeb] mb-6 overflow-hidden">
              <div className="font-semibold text-[#171717] mb-1 font-mono text-sm">
                {pendingApproval.name}
              </div>
              <pre className="text-[#666] font-mono text-xs overflow-x-auto pt-2 border-t border-[#ebebeb] mt-2">
                {JSON.stringify(pendingApproval.args, null, 2)}
              </pre>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={handleReject} className="px-5 py-2.5 rounded-full border border-[#ebebeb] text-[#171717] font-medium text-sm hover:bg-[#f5f5f5] transition-colors">
                Reject Action
              </button>
              <button onClick={handleApprove} className="px-5 py-2.5 rounded-full bg-orange-600 text-white font-medium text-sm hover:bg-orange-700 transition-colors shadow-md">
                Approve & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex h-16 items-center px-6 bg-white border-b border-[#ebebeb]">
        <h1 className="text-xl font-semibold tracking-tight">Nexus Knowledge Worker</h1>
      </header>

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-[#888888] mt-20">
            Send a message to start chatting with the enterprise AI.
          </div>
        )}
        
        {messages.map((m) => {
          // Do not render our hidden magic strings in the UI!
          const textContent = (m.parts?.find((p: any) => p.type === 'text') as any)?.text || "";
          if (textContent === "[HUMAN_APPROVAL_YES]" || textContent === "[HUMAN_APPROVAL_NO]" || textContent.startsWith("[APPROVAL_REQUEST]")) return null;
          
          return (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-xl max-w-[80%] shadow-[0px_1px_1px_#00000005,0px_2px_2px_#0000000a] border border-[#ebebeb] ${
                m.role === 'user' 
                  ? 'bg-[#171717] text-white' 
                  : 'bg-white text-[#171717]'
              }`}>
                <div className="text-xs font-medium mb-2 opacity-70 uppercase tracking-wider">
                  {m.role === 'user' ? 'You' : 'Nexus AI'}
                </div>
                
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {m.parts?.map((part: any, index: number) => {
                    
                    // Render standard text
                    if (part.type === 'text') {
                      return <span key={index}>{part.text}</span>;
                    }
                    
                    // Render tool calls (Vercel SDK maps the `9:` stream format into this)
                    if (part.type === 'tool-invocation') {
                      return (
                        <div key={index} className="mt-2 mb-2 p-3 bg-[#fafafa] border border-[#ebebeb] text-[#171717] rounded-lg flex items-center gap-3">
                           <div className="w-4 h-4 border-2 border-[#888] border-t-transparent rounded-full animate-spin"></div>
                           <span className="font-mono text-xs font-medium tracking-tight">
                             Executing <span className="text-blue-600">{part.toolInvocation.toolName}</span>...
                           </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Input Form Area */}
      <div className="p-6 bg-white border-t border-[#ebebeb]">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
          <input
            className="flex-1 h-12 px-4 rounded-lg border border-[#ebebeb] bg-[#fafafa] text-sm focus:outline-none focus:border-[#171717] transition-colors disabled:opacity-50"
            value={input}
            placeholder="Ask a question about your enterprise data..."
            onChange={(e) => setInput(e.target.value)}
            disabled={!!pendingApproval}
          />
          <button 
            type="submit"
            disabled={!!pendingApproval}
            className="h-12 px-6 rounded-full bg-[#171717] text-white font-medium text-sm hover:bg-black transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
      
    </div>
  );
}
