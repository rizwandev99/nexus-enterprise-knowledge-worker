"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ModelSelector from "./model-selector";

export interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  selectedPrompt?: string;
  onClearSelectedPrompt?: () => void;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
}

interface AttachedFile {
  name: string;
  size: number;
  text: string;
}

const QUICK_PROMPTS = [
  { label: "Search documents", text: "Search internal enterprise knowledge base for security policies" },
  { label: "SQL Query", text: "Execute a database mutation to update document title in documents table" },
  { label: "Audit Logs", text: "Summarize recent compliance and database mutation audit logs" },
  { label: "System SLA", text: "What are the SLA uptime targets and P95 latency specifications for Nexus microservices?" },
];

export default function ChatInput({
  onSend,
  isLoading,
  selectedPrompt,
  onClearSelectedPrompt,
  selectedModel = "groq-gpt-oss-120b",
  onSelectModel,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSearchActive, setIsSearchActive] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync selected prompt from feature bento card click
  useEffect(() => {
    if (selectedPrompt) {
      setInput(selectedPrompt);
      onClearSelectedPrompt?.();
      textareaRef.current?.focus();
    }
  }, [selectedPrompt, onClearSelectedPrompt]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to parse file");
      }

      setAttachedFile({
        name: data.filename,
        size: data.size,
        text: data.text,
      });

      if (!input.trim()) {
        setInput(`Ingest document: ${data.filename}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error reading file";
      setParseError(errMsg);
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if ((!text && !attachedFile) || isLoading || isParsingFile) return;

      let fullPayload = text || (attachedFile ? `Ingest document: ${attachedFile.name}` : "");

      if (attachedFile) {
        fullPayload += `\n\n[ATTACHED DOCUMENT: ${attachedFile.name}]\n--- ATTACHED DOCUMENT CONTENT (${attachedFile.name}) ---\n${attachedFile.text}\n--- END ATTACHED DOCUMENT CONTENT ---`;
      }

      setInput("");
      setAttachedFile(null);
      setParseError(null);
      onSend(fullPayload);
    },
    [input, attachedFile, isLoading, isParsingFile, onSend]
  );

  const canSend = (input.trim().length > 0 || attachedFile !== null) && !isLoading && !isParsingFile;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="shrink-0 px-4 sm:px-6 pb-6 pt-1 relative z-20">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Floating suggestion pills above input */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInput(prompt.text);
                textareaRef.current?.focus();
              }}
              className="shrink-0 px-3 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/15 backdrop-blur-md transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Floating Glass Omni-Input Container */}
        <form
          onSubmit={handleSubmit}
          aria-label="Chat input form"
          className="relative w-full"
        >
          <div
            className={`relative rounded-3xl p-3 sm:p-3.5 transition-all duration-200 bg-slate-900/60 backdrop-blur-2xl border ${
              isFocused
                ? "border-violet-500/40 shadow-[0_0_30px_rgba(99,102,241,0.15),0_12px_40px_rgba(0,0,0,0.6)]"
                : "border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            }`}
          >
            {/* Attached File Pill Badge */}
            {attachedFile && (
              <div className="mb-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono">
                <div className="flex items-center gap-2 truncate">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate max-w-[240px] font-medium">{attachedFile.name}</span>
                  <span className="text-slate-400 text-[10px]">({formatFileSize(attachedFile.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-slate-400 hover:text-white transition-colors ml-2"
                  aria-label="Remove attachment"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Parse Error Notification */}
            {parseError && (
              <div className="mb-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl flex items-center justify-between">
                <span>{parseError}</span>
                <button
                  type="button"
                  onClick={() => setParseError(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              aria-label="Ask me anything"
              rows={1}
              className="w-full resize-none bg-transparent text-sm leading-relaxed focus:outline-none placeholder:text-slate-500 text-slate-100 px-1 py-1"
              style={{
                minHeight: "42px",
                maxHeight: "160px",
              }}
              placeholder={
                isLoading
                  ? "Nexus agent processing query…"
                  : isParsingFile
                  ? "Extracting document content…"
                  : "Ask anything, search knowledge base, or run SQL mutations..."
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
              disabled={isLoading || isParsingFile}
            />

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".txt,.md,.pdf,.json,.csv,.doc,.docx,.js,.ts,.py,.html,.css,.log"
              onChange={handleFileChange}
            />

            {/* Bottom Tool Rail */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/5">
              {/* Left Action Cluster */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 1. Expanding Search Pill */}
                <button
                  type="button"
                  onClick={() => setIsSearchActive((p) => !p)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isSearchActive
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                      : "bg-white/5 text-slate-400 border border-white/5 hover:text-slate-200"
                  }`}
                  title={isSearchActive ? "Hybrid Search Active (pgvector + tsvector)" : "Toggle Knowledge Base Search"}
                >
                  <svg className="w-3.5 h-3.5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span className="text-[11px] font-mono">Search</span>
                </button>

                {/* 2. Workspace / Multi-Layer Icon */}
                <button
                  type="button"
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                  title="Enterprise Workspace Active"
                  aria-label="Workspace Active"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </button>

                {/* 3. Attachment Paperclip */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isParsingFile}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer disabled:opacity-50"
                  title="Attach Document (.pdf, .txt, .md, .csv)"
                  aria-label="Attach Document"
                >
                  <svg
                    className="w-4 h-4"
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
                </button>
              </div>

              {/* Right Action Cluster */}
              <div className="flex items-center gap-2">
                {/* Model Selector */}
                {onSelectModel && (
                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    compact
                    align="top"
                  />
                )}

                {/* Send / Waveform Action Button */}
                <button
                  type="submit"
                  disabled={!canSend}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                    canSend
                      ? "bg-white text-slate-950 shadow-[0_0_15px_rgba(255,255,255,0.35)] cursor-pointer"
                      : "bg-white/5 text-slate-500 border border-white/5 cursor-default"
                  }`}
                  aria-label="Send message"
                  title="Send message (Enter)"
                >
                  {isLoading || isParsingFile ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-4 h-4"
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
          </div>
        </form>
      </div>
    </div>
  );
}
