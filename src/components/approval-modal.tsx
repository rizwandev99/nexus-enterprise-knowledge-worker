"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";

interface ApprovalModalProps {
  pendingApproval: UIMessage | null;
  onApprove: () => void;
  onReject: () => void;
}

export default function ApprovalModal({ pendingApproval, onApprove, onReject }: ApprovalModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingApproval) modalRef.current?.focus();
  }, [pendingApproval]);

  if (!pendingApproval) return null;

  const approvalPart = pendingApproval.parts?.find(
    (p: { type: string; text?: string }) =>
      p.type === "text" && p.text?.includes("__APPROVAL_REQUEST__")
  ) as { type: "text"; text: string } | undefined;
  const approvalText = approvalPart?.text?.replace("__APPROVAL_REQUEST__\n", "");

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-title"
        tabIndex={-1}
        className="outline-none w-full max-w-md rounded-3xl overflow-hidden bg-slate-900/90 backdrop-blur-2xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.15)]"
        style={{
          animation: "modal-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        {/* Header stripe */}
        <div
          className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600"
        />

        <div className="p-6 sm:p-7">
          {/* Icon + title */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2
                id="approval-title"
                className="text-base font-bold tracking-tight text-white"
              >
                Human-in-the-Loop Approval
              </h2>
              <p className="text-xs mt-1 text-slate-400 leading-relaxed">
                The autonomous agent paused at a graph interrupt boundary to request database mutation authorization.
              </p>
            </div>
          </div>

          {/* Code block */}
          <div
            className="rounded-2xl p-4 mb-6 overflow-auto bg-slate-950/80 border border-white/10 max-h-[220px]"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 font-mono text-[10px] text-slate-400">
              <span>SQL Mutation Payload</span>
              <span className="text-amber-400">DML Allowed</span>
            </div>
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap break-all text-slate-300 font-mono"
            >
              {approvalText}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={onReject}
              className="px-5 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-white/10 transition-all active:scale-95 cursor-pointer"
            >
              Reject Operation
            </button>
            <button
              onClick={onApprove}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.35)] cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Approve & Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
