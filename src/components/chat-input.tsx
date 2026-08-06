"use client";

import { useState, useCallback } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");

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

  return (
    <div className="p-6 bg-canvas border-t border-hairline shrink-0">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative w-full flex items-center">
        <input
          aria-label="Chat input"
          className="w-full h-12 px-4 rounded-md border border-hairline bg-canvas text-ink text-sm focus:outline-none focus:border-hairline-strong transition-colors disabled:opacity-50 pr-24 shadow-sm"
          value={input}
          placeholder="Ask a question about your enterprise data..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-1 top-1 bottom-1 px-4 rounded-md bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
