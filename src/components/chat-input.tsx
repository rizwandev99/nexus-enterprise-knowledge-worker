"use client";

import { useState, useRef, useEffect } from "react";
import ModelSelector from "./model-selector";

export interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  selectedPrompt?: string;
  onClearSelectedPrompt?: () => void;
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
}

const SUGGESTION_CHIPS = [
  { label: "Search documents", prompt: "Search documents for enterprise security compliance" },
  { label: "SQL Mutation", prompt: "Execute SQL Mutation: UPDATE documents SET title = 'Updated Policy' WHERE id = 'doc-1';" },
  { label: "Audit Logs", prompt: "Review system audit logs and recent agent mutations" },
  { label: "System SLA", prompt: "Check system SLA, uptime metrics and telemetry status" },
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
  const [isSearchActive, setIsSearchActive] = useState(true);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    content: string;
    size: number;
  } | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedPrompt) {
      setInput(selectedPrompt);
      onClearSelectedPrompt?.();
      textareaRef.current?.focus();
    }
  }, [selectedPrompt, onClearSelectedPrompt]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || isLoading || isParsingFile) return;

    let payload = trimmed;
    if (attachedFile) {
      payload = trimmed
        ? trimmed + "\n\n[ATTACHED DOCUMENT: " + attachedFile.name + " (" + formatFileSize(attachedFile.size) + ")]\n--- ATTACHED DOCUMENT CONTENT\n" + attachedFile.content
        : "[ATTACHED DOCUMENT: " + attachedFile.name + " (" + formatFileSize(attachedFile.size) + ")]\n--- ATTACHED DOCUMENT CONTENT\n" + attachedFile.content;
    }

    onSend(payload);
    setInput("");
    setAttachedFile(null);
    setParseError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setParseError("File exceeds 20MB maximum upload limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsParsingFile(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to parse document");
      }

      const data = await res.json();
      setAttachedFile({
        name: data.filename || file.name,
        content: data.text,
        size: data.size || file.size,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract text from file";
      setParseError(msg);
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const canSend = (input.trim().length > 0 || attachedFile !== null) && !isLoading && !isParsingFile;

  return (
    <div className="w-full px-4 pb-4 pt-1 shrink-0 relative z-20">
      <div className="max-w-2xl mx-auto">
        {/* Floating Suggestion Chips above Input */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-2 px-1">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setInput(chip.prompt);
                textareaRef.current?.focus();
              }}
              className="text-xs font-medium text-slate-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-full px-3 py-1 transition-all shrink-0 cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="w-full"
        >
          {/* Floating rounded-2xl glass pill */}
          <div className="relative rounded-2xl p-3 bg-[#121622]/80 backdrop-blur-2xl border border-white/[0.08] focus-within:border-white/20 focus-within:ring-1 focus-within:ring-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-all">
            {attachedFile && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono bg-white/[0.04] border border-white/[0.08] text-slate-200">
                <svg
                  className="w-3.5 h-3.5 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate max-w-[200px] font-medium">{attachedFile.name}</span>
                <span className="text-slate-400 text-[10px]">({formatFileSize(attachedFile.size)})</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="text-slate-400 hover:text-white transition-colors ml-2 cursor-pointer"
                  aria-label="Remove attachment"
                >
                  ✕
                </button>
              </div>
            )}

            {parseError && (
              <div className="mb-2 text-xs font-mono text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl flex items-center justify-between">
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
              aria-label="Ask me anything, search knowledge base, or run SQL mutations..."
              rows={1}
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none resize-none font-normal leading-relaxed px-1 py-1"
              style={{
                minHeight: "40px",
                maxHeight: "160px",
              }}
              placeholder={
                isLoading
                  ? "Sense AI processing query..."
                  : isParsingFile
                  ? "Extracting document content..."
                  : "Ask me anything, search knowledge base, or run SQL mutations..."
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isLoading || isParsingFile}
            />

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".txt,.md,.pdf,.json,.csv,.doc,.docx,.js,.ts,.py,.html,.css,.log"
              onChange={handleFileChange}
            />

            {/* Bottom Bar Controls */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/[0.06]">
              {/* Bottom Bar Left: Attachment (Paperclip), Search pill toggle (Globe), Canvas (Layers) */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isParsingFile}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
                  title="Attach Document (.pdf, .txt, .md, .csv)"
                  aria-label="Attach Document"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.97 8.8l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSearchActive((p) => !p)}
                  className={`inline-flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                    isSearchActive
                      ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full px-2.5 py-1 font-medium shadow-sm"
                      : "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                  title={isSearchActive ? "Globe Search Enabled" : "Toggle Globe Search"}
                  aria-label="Toggle Globe Search"
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  {isSearchActive && <span className="text-xs font-medium">Globe Search</span>}
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer inline-flex items-center justify-center"
                  title="Canvas Workspace"
                  aria-label="Canvas Workspace"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
                    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
                  </svg>
                </button>
              </div>

              {/* Bottom Bar Right: Model Selector badge / dropdown, Send Button */}
              <div className="flex items-center gap-2">
                {onSelectModel ? (
                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    compact
                    align="top"
                  />
                ) : (
                  <div className="text-xs font-mono text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1">
                    Groq GPT-OSS 120B ~850 tok/s
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSend}
                  className="w-8 h-8 rounded-xl bg-white text-slate-950 hover:bg-slate-200 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95"
                  aria-label="Send message"
                  title="Send message (Enter)"
                >
                  {isLoading || isParsingFile ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 7-7 7 7" />
                      <path d="M12 19V5" />
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
