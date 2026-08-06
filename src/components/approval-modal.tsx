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
    if (pendingApproval) {
      modalRef.current?.focus();
    }
  }, [pendingApproval]);

  if (!pendingApproval) return null;

  const approvalPart = pendingApproval.parts?.find(
    (p: { type: string; text?: string }) => p.type === "text" && p.text?.includes("__APPROVAL_REQUEST__")
  ) as { type: "text"; text: string } | undefined;
  const approvalText = approvalPart?.text?.replace("__APPROVAL_REQUEST__\n", "");

  return (
    <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-title"
        tabIndex={-1}
        className="bg-canvas rounded-xl shadow-2xl max-w-md w-full p-8 border border-hairline outline-none"
        style={{ animation: "modal-fade-in 0.2s ease-out forwards" }}
      >
        <div className="w-12 h-12 bg-warning-soft text-warning-deep rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 id="approval-title" className="text-2xl font-semibold tracking-tight text-ink mb-2">Action Approval Required</h2>
        <p className="text-body mb-6 text-sm leading-relaxed">
          The AI is attempting to execute a sensitive operation. Please review and approve or reject this action.
        </p>
        <div className="bg-canvas-soft p-4 rounded-md border border-hairline mb-8 overflow-hidden">
          <pre className="text-body font-mono text-xs overflow-x-auto">
            {approvalText}
          </pre>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onReject} className="px-4 py-2 rounded-full border border-hairline text-ink font-medium text-sm hover:bg-canvas-soft transition-colors">
            Reject
          </button>
          <button onClick={onApprove} className="px-4 py-2 rounded-full bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-opacity">
            Approve &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
