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

export default function ChatInput({
  onSend,
  isLoading,
  selectedPrompt,
  onClearSelectedPrompt,
  selectedModel = "gpt-oss-120b",
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="w-full"
        >
          <div className="relative rounded-3xl p-3 bg-[#202736]/90 border border-slate-700/60 shadow-2xl backdrop-blur-xl transition-all">
            {attachedFile && (
              <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-800/80 border border-slate-700/60 text-slate-200">
                <span className="text-slate-400">📄</span>
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

            <textarea
              ref={textareaRef}
              aria-label="Ask me anything"
              rows={1}
              className="w-full resize-none bg-transparent font-mono text-sm leading-relaxed focus:outline-none placeholder:text-slate-500 text-slate-100 px-2 py-1"
              style={{
                minHeight: "40px",
                maxHeight: "160px",
              }}
              placeholder={
                isLoading
                  ? "Sense AI processing query..."
                  : isParsingFile
                  ? "Extracting document content..."
                  : "Ask me anything..."
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

            <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-700/50">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isParsingFile}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all cursor-pointer disabled:opacity-50"
                  title="Attach Document (.pdf, .txt, .md, .csv)"
                  aria-label="Attach Document"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSearchActive((p) => !p)}
                  className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all cursor-pointer " + (isSearchActive ? "bg-slate-700/80 text-white border border-slate-600/60 shadow-sm" : "bg-transparent text-slate-400 hover:text-white")}
                  title={isSearchActive ? "Search Active" : "Toggle Search"}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span className="text-[11px]">Search</span>
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all cursor-pointer"
                  title="Workspace Window"
                  aria-label="Workspace"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onSelectModel && (
                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelectModel={onSelectModel}
                    compact
                    align="top"
                  />
                )}

                <div className="hidden sm:flex items-center gap-1 bg-slate-700/70 text-slate-300 rounded-full px-2.5 py-1 text-xs font-mono select-none" title="Audio / Voice ready">
                  <span className="w-0.5 h-3 bg-slate-300 rounded-full animate-pulse" />
                  <span className="w-0.5 h-4 bg-slate-300 rounded-full animate-pulse delay-75" />
                  <span className="w-0.5 h-2 bg-slate-300 rounded-full animate-pulse delay-150" />
                  <span className="w-0.5 h-3.5 bg-slate-300 rounded-full animate-pulse delay-100" />
                </div>

                <button
                  type="submit"
                  disabled={!canSend}
                  className={"w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 " + (canSend ? "bg-white text-slate-950 shadow-md hover:bg-slate-100 cursor-pointer" : "bg-slate-800 text-slate-500 cursor-default")}
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
