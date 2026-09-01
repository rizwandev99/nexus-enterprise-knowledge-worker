"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";

interface ApprovalModalProps {
  pendingApproval: UIMessage | null;
  onApprove: () => void;
  onReject: () => void;
}

export default function ApprovalModal({
  pendingApproval,
  onApprove,
  onReject,
}: ApprovalModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingApproval) modalRef.current?.focus();
  }, [pendingApproval]);

  if (!pendingApproval) return null;

  const messageRecord = pendingApproval as unknown as { content?: string; parts?: Array<unknown> };
  const rawApprovalText =
    (Array.isArray(messageRecord.parts)
      ? messageRecord.parts
          .map((p) => {
            if (typeof p === "string") return p;
            if (p && typeof p === "object" && "text" in p && typeof (p as { text?: string }).text === "string") {
              return (p as { text: string }).text;
            }
            return "";
          })
          .find((txt) => txt.includes("__APPROVAL_REQUEST__")) || ""
      : "") ||
    (typeof messageRecord.content === "string" && messageRecord.content.includes("__APPROVAL_REQUEST__")
      ? messageRecord.content
      : "");
  const approvalText = rawApprovalText
    .replace("__APPROVAL_REQUEST__\n", "")
    .replace("__APPROVAL_REQUEST__", "")
    .trim();

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-title"
        tabIndex={-1}
        className="outline-none w-full max-w-lg bg-[#151a24]/95 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl"
        style={{
          animation: "modal-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        {/* Warning Accent Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        {/* Warning Icon & Header */}
        <div className="flex items-start gap-4 mb-4 mt-1">
          <div className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2
                id="approval-title"
                className="text-base font-bold tracking-tight text-white"
              >
                Human-in-the-Loop Approval
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold uppercase tracking-wider">
                Risk: High
              </span>
            </div>
            <p className="text-xs mt-1 text-slate-400 leading-relaxed">
              The autonomous agent paused at a LangGraph <code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded text-[11px] font-mono">interrupt()</code> boundary to request database mutation authorization.
            </p>
          </div>
        </div>

        {/* Security & Table Whitelist Metadata Badge */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-teal-400 font-semibold">Security Policy:</span>
            <span className="text-slate-400">ALLOWED_MUTATION_TABLES</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
            documents, document_chunks
          </span>
        </div>

        {/* SQL Diff / Payload Monospace Viewer */}
        <div className="rounded-2xl p-4 mb-5 overflow-auto bg-slate-950/90 border border-slate-800 max-h-[220px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 font-mono text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              SQL Mutation Payload
            </span>
            <span className="text-amber-400/90 font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
              DML Allowed
            </span>
          </div>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap break-all text-slate-300 font-mono selection:bg-amber-500/30 selection:text-white">
            {approvalText}
          </pre>
        </div>

        {/* Actions / Gradient Buttons */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onReject}
            className="px-5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-gradient-to-r from-slate-800 to-slate-800/90 hover:from-slate-700 hover:to-slate-700/90 border border-slate-700/60 hover:border-slate-600 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            Reject Operation
          </button>
          <button
            type="button"
            onClick={onApprove}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Approve & Execute
          </button>
        </div>
      </div>
    </div>
  );
}
