"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-6 right-5 z-50 flex flex-col gap-2"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastBubble key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICON: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

const COLORS: Record<ToastType, { icon: string; bar: string }> = {
  success: { icon: "var(--color-success)", bar: "var(--color-success)" },
  error:   { icon: "var(--color-error)",   bar: "var(--color-error)"   },
  info:    { icon: "var(--color-brand)",   bar: "var(--color-brand)"   },
};

function ToastBubble({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3700);
    const t2 = setTimeout(() => onRemove(toast.id), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onRemove]);

  const colors = COLORS[toast.type];

  return (
    <div
      role="alert"
      className="flex items-center gap-3 pl-3 pr-4 py-3 rounded-xl min-w-[240px] max-w-[360px] relative overflow-hidden"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border-strong)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        animation: leaving ? "toast-out 0.3s cubic-bezier(0.4,0,1,1) forwards" : "toast-in 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: colors.bar }}
      />

      {/* Icon */}
      <div
        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ml-1"
        style={{
          background: `${colors.icon}1a`,
          color: colors.icon,
        }}
      >
        {ICON[toast.type]}
      </div>

      {/* Text */}
      <span
        className="text-sm leading-snug flex-1"
        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" }}
      >
        {toast.message}
      </span>

      {/* Dismiss */}
      <button
        onClick={() => { setLeaving(true); setTimeout(() => onRemove(toast.id), 300); }}
        className="shrink-0 ml-1 rounded-md p-1 transition-opacity opacity-40 hover:opacity-100"
        aria-label="Dismiss"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
    };
  }
  return ctx;
}

