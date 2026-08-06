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
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-title"
        tabIndex={-1}
        className="outline-none w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-strong)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
          animation: "modal-in 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
        }}
      >
        {/* Header stripe */}
        <div
          className="h-1 w-full"
          style={{ background: "linear-gradient(90deg, #f59e0b, #ef4444)" }}
        />

        <div className="p-7">
          {/* Icon + title */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--color-warning-muted)", color: "var(--color-warning)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h2
                id="approval-title"
                className="text-base font-semibold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                Human Approval Required
              </h2>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                The agent is requesting permission to execute a sensitive operation.
              </p>
            </div>
          </div>

          {/* Code block */}
          <div
            className="rounded-xl p-4 mb-6 overflow-auto"
            style={{
              background: "var(--color-base)",
              border: "1px solid var(--color-border)",
              maxHeight: "200px",
            }}
          >
            <pre
              className="text-xs leading-relaxed whitespace-pre-wrap break-all"
              style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)" }}
            >
              {approvalText}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={onReject}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-80 active:scale-95"
              style={{
                background: "var(--color-surface-3)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
              }}
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-95 flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                color: "#fff",
                boxShadow: "0 2px 16px var(--color-brand-glow)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Approve & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
