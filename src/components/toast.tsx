"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

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
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
    }, 3700);
    const removeTimer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  const bgColors: Record<ToastType, string> = {
    success: "bg-success text-on-primary",
    error: "bg-error text-on-primary",
    info: "bg-primary text-on-primary",
  };

  return (
    <div
      className={`px-4 py-3 rounded shadow-lg flex items-center text-sm font-medium ${bgColors[toast.type]}`}
      style={{
        animation: isLeaving ? "toast-slide-out 0.3s forwards" : "toast-slide-in 0.3s forwards",
      }}
      role="alert"
    >
      {toast.message}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
