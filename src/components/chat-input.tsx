"use client";

import { useState, useEffect, useCallback } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(input.length);
  }, [input]);

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
    <div
      className="shrink-0 px-4 pb-5 pt-3"
      style={{ background: "linear-gradient(to top, var(--color-base) 70%, transparent)" }}
    >
      <form
        onSubmit={handleSubmit}
        aria-label="Chat input form"
        className="max-w-2xl mx-auto relative"
      >
        {/* Input container */}
        <div
          className="relative rounded-2xl transition-all duration-200"
          style={{
            background: "var(--color-surface)",
            border: `1px solid ${isFocused ? "var(--color-border-focus)" : "var(--color-border)"}`,
            boxShadow: isFocused
              ? "0 0 0 3px var(--color-brand-glow), 0 8px 32px rgba(0,0,0,0.5)"
              : "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          <textarea
            aria-label="Ask your enterprise knowledge base"
            rows={1}
            className="w-full resize-none bg-transparent px-5 py-4 pr-28 text-sm leading-relaxed focus:outline-none disabled:opacity-40 placeholder:transition-opacity"
            style={{
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-sans)",
              minHeight: "52px",
              maxHeight: "180px",
            }}
            placeholder={
              isLoading
                ? "Nexus is thinking…"
                : "Ask anything about your enterprise data…"
            }
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
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

          {/* Bottom row */}
          <div className="flex items-center justify-between px-4 pb-3">
            {/* Char count hint */}
            <span
              className="text-xs transition-opacity duration-150"
              style={{
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                opacity: charCount > 0 ? 1 : 0,
              }}
            >
              {charCount}
            </span>

            {/* Keyboard hint + submit */}
            <div className="flex items-center gap-2">
              {!isLoading && (
                <span
                  className="text-xs hidden sm:block"
                  style={{
                    color: "var(--color-text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ↵ send &nbsp;·&nbsp; ⇧↵ newline
                </span>
              )}
              <button
                type="submit"
                disabled={!canSend}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95"
                style={{
                  background: canSend ? "var(--color-brand)" : "var(--color-surface-3)",
                  color: canSend ? "#fff" : "var(--color-text-muted)",
                  boxShadow: canSend ? "0 2px 12px var(--color-brand-glow)" : "none",
                  cursor: canSend ? "pointer" : "default",
                }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                  </span>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom meta */}
        <p className="text-center mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Nexus uses hybrid RAG + LangGraph agents. Responses may be inaccurate.
        </p>
      </form>
    </div>
  );
}
