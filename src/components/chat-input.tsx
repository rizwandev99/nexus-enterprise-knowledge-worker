"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  selectedPrompt?: string;
  onClearSelectedPrompt?: () => void;
}

export default function ChatInput({
  onSend,
  isLoading,
  selectedPrompt,
  onClearSelectedPrompt,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected prompt from feature bento card click
  useEffect(() => {
    if (selectedPrompt) {
      setInput(selectedPrompt);
      onClearSelectedPrompt?.();
    }
  }, [selectedPrompt, onClearSelectedPrompt]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || isLoading) return;
      setInput("");
      onSend(text);
    },
    [input, isLoading, onSend]
  );

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div className="shrink-0 px-4 pb-6 pt-2 relative z-20">
      <form
        onSubmit={handleSubmit}
        aria-label="Chat input form"
        className="max-w-3xl mx-auto relative w-full"
      >
        {/* Main Input Container (Exact match of inspiration screenshot) */}
        <div
          className="relative rounded-2xl p-4 transition-all duration-200"
          style={{
            background: "rgba(18, 20, 27, 0.9)",
            border: `1px solid ${isFocused ? "var(--color-brand)" : "rgba(255, 255, 255, 0.1)"}`,
            backdropFilter: "blur(20px)",
            boxShadow: isFocused
              ? "0 0 0 3px rgba(20, 184, 166, 0.2), 0 12px 36px rgba(0, 0, 0, 0.6)"
              : "0 8px 32px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Top Left Sparkle Icon ✦ */}
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <svg
              className="w-4 h-4 text-teal-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>

          {/* Text Area */}
          <textarea
            aria-label="Ask me anything"
            rows={2}
            className="w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none placeholder:text-gray-500 placeholder:font-light"
            style={{
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-sans)",
              minHeight: "48px",
              maxHeight: "160px",
            }}
            placeholder={
              isLoading
                ? "Nexus agent processing query…"
                : "Ask me anything......"
            }
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isLoading}
          />

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const fileName = e.target.files[0].name;
                setInput((prev) =>
                  prev ? `${prev} [Attached file: ${fileName}]` : `Ingest document: ${fileName}`
                );
              }
            }}
          />

          {/* Bottom Bar inside Input Box */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/5">
            {/* Left Action: Attach File Pill Button (From Inspiration Image) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1a1d26] text-gray-300 border border-white/10 hover:border-teal-500/40 hover:text-white transition-all active:scale-95"
            >
              <svg
                className="w-3.5 h-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              Attach file
            </button>

            {/* Right Action: Teal Upward Arrow Submit Button ↑ (From Inspiration Image) */}
            <button
              type="submit"
              disabled={!canSend}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
              style={{
                background: canSend ? "#14b8a6" : "rgba(255, 255, 255, 0.06)",
                color: canSend ? "#090a0f" : "var(--color-text-muted)",
                boxShadow: canSend ? "0 0 16px rgba(20, 184, 166, 0.4)" : "none",
                cursor: canSend ? "pointer" : "default",
              }}
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-5 h-5 font-bold"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
