"use client";

import React, { useState, useMemo } from "react";
import type { UIMessage } from "@ai-sdk/react";

export interface MessageBubbleProps {
  message: UIMessage;
  isUser: boolean;
  onSelectCitation?: (docIndex: number) => void;
  selectedModel?: string;
  isStreaming?: boolean;
}

export default function MessageBubble({
  message,
  isUser,
  onSelectCitation,
  selectedModel = "gpt-oss-120b",
  isStreaming = false,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [showTelemetryPopover, setShowTelemetryPopover] = useState(false);

  const partsText = useMemo(() => {
    let text = "";
    if (message.parts && Array.isArray(message.parts) && message.parts.length > 0) {
      text = message.parts
        .map((p) => {
          if (typeof p === "string") return p;
          if (p && typeof p === "object" && "text" in p && typeof (p as { text?: string }).text === "string") {
            return (p as { text: string }).text;
          }
          return "";
        })
        .join("");
    }
    if (!text && typeof (message as unknown as { content?: string }).content === "string") {
      text = (message as unknown as { content: string }).content;
    }
    return text || "";
  }, [message]);

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleCopyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const handleFeedback = (type: "up" | "down") => {
    setFeedback((prev) => (prev === type ? null : type));
  };

  const attachmentMatch = partsText.match(
    /\[ATTACHED DOCUMENT: (.+?) \((\d+(?:\.\d+)?\s*(?:B|KB|MB))\)\]/
  );
  const attachedFileName = attachmentMatch ? attachmentMatch[1] : null;
  const attachedFileSize = attachmentMatch ? attachmentMatch[2] : null;

  const cleanUserText = partsText
    .replace(/\[ATTACHED DOCUMENT: .+?\(\d+(?:\.\d+)?\s*(?:B|KB|MB)\)\][\s\S]*$/g, "")
    .trim();

  const citationMatches = useMemo(() => {
    if (isUser) return [];
    const set = new Set<number>();
    const re = /\[Doc[-\u2010-\u2015\u2212\s]?(\d+)\]/gi;
    let m;
    while ((m = re.exec(partsText)) !== null) {
      set.add(parseInt(m[1], 10));
    }
    return Array.from(set);
  }, [partsText, isUser]);

  const telemetry = useMemo(() => {
    const promptToks = Math.max(12, Math.round(partsText.length / 5));
    const completionToks = Math.max(18, Math.round(partsText.length / 3.8));
    const totalToks = promptToks + completionToks;
    const latency = isStreaming ? 42 : Math.max(85, Math.round(totalToks * 1.8));
    const cost = ((promptToks * 0.15 + completionToks * 0.6) / 1_000_000).toFixed(6);

    return {
      promptTokens: promptToks,
      completionTokens: completionToks,
      totalTokens: totalToks,
      latencyMs: latency,
      cost: cost,
      engine: selectedModel || "gpt-oss-120b",
      speed: "850 tok/s",
    };
  }, [partsText, selectedModel, isStreaming]);

  const renderFormattedContent = (content: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const blocks: { type: "text" | "code"; content: string; language?: string }[] = [];

    let lastIdx = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        blocks.push({
          type: "text",
          content: content.slice(lastIdx, match.index),
        });
      }
      blocks.push({
        type: "code",
        language: match[1] || "text",
        content: match[2].trim(),
      });
      lastIdx = codeBlockRegex.lastIndex;
    }

    if (lastIdx < content.length) {
      blocks.push({
        type: "text",
        content: content.slice(lastIdx),
      });
    }

    return blocks.map((block, bIdx) => {
      if (block.type === "code") {
        const isCopied = copiedCodeIdx === bIdx;
        return (
          <div
            key={bIdx}
            className="my-3 rounded-2xl overflow-hidden border border-white/[0.12] bg-[#10131c] text-xs font-mono shadow-md"
          >
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#181c26]/90 border-b border-white/[0.10] text-[11px] text-slate-300">
              <span className="font-semibold uppercase tracking-wider">{block.language}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(block.content, bIdx)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-white/[0.10] text-slate-300 hover:text-white transition-colors cursor-pointer"
                aria-label="copy code to clipboard"
              >
                {isCopied ? <span>Copied!</span> : <span>Copy</span>}
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-slate-200 leading-relaxed">
              <code>{block.content}</code>
            </pre>
          </div>
        );
      }

      return renderTextParagraphs(block.content, bIdx);
    });
  };

  const renderTextParagraphs = (text: string, baseKey: number) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = (k: number) => {
      if (tableBuffer.length === 0) return;
      const rows = tableBuffer.map((r) => {
        let parts = r.trim().split("|").map((c) => c.trim());
        if (parts.length > 0 && parts[0] === "") parts.shift();
        if (parts.length > 0 && parts[parts.length - 1] === "") parts.pop();
        return parts;
      });
      const header = rows[0] || [];
      const colCount = Math.max(1, header.length);
      const isDivider = (r: string[]) => r.every((c) => /^[:-]+$/.test(c));
      const bodyRows = rows.slice(1).filter((r) => !isDivider(r));

      elements.push(
        <div key={"tbl-" + k} className="my-3 overflow-x-auto rounded-2xl border border-white/[0.12] bg-[#10131c]/90 shadow-md">
          <table className="w-full text-xs text-left text-slate-200">
            <thead className="text-[11px] uppercase tracking-wider font-mono bg-[#181c26] text-slate-200 border-b border-white/[0.10]">
              <tr>
                {header.map((col, idx) => (
                  <th key={idx} className="px-3.5 py-2.5 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {bodyRows.map((row, rIdx) => {
                const paddedRow = [...row];
                while (paddedRow.length < colCount) {
                  paddedRow.push("...");
                }
                return (
                  <tr key={rIdx} className="hover:bg-white/[0.04] transition-colors">
                    {paddedRow.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2">
                        {renderInlineElements(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = [];
    };

    lines.forEach((line, lIdx) => {
      if (line.trim().startsWith("|")) {
        tableBuffer.push(line);
      } else {
        if (tableBuffer.length > 0) flushTable(baseKey * 1000 + lIdx);

        if (line.startsWith("### ")) {
          elements.push(
            <h3 key={lIdx} className="text-sm font-semibold text-white tracking-tight mt-3 mb-1">
              {renderInlineElements(line.replace("### ", ""))}
            </h3>
          );
        } else if (line.startsWith("## ")) {
          elements.push(
            <h2 key={lIdx} className="text-base font-bold text-white tracking-tight mt-4 mb-1">
              {renderInlineElements(line.replace("## ", ""))}
            </h2>
          );
        } else if (line.startsWith("# ")) {
          elements.push(
            <h1 key={lIdx} className="text-lg font-bold text-white tracking-tight mt-4 mb-2">
              {renderInlineElements(line.replace("# ", ""))}
            </h1>
          );
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          elements.push(
            <li key={lIdx} className="ml-4 list-disc text-slate-300 text-xs sm:text-sm my-0.5">
              {renderInlineElements(line.replace(/^[-*]\s+/, ""))}
            </li>
          );
        } else if (line.trim().length > 0) {
          elements.push(
            <p key={lIdx} className="text-xs sm:text-sm text-slate-200 leading-relaxed my-1">
              {renderInlineElements(line)}
            </p>
          );
        }
      }
    });

    if (tableBuffer.length > 0) flushTable(baseKey * 1000 + lines.length);

    return elements;
  };

  const renderInlineElements = (text: string) => {
    const parts = text.split(/(\[Doc[-\u2010-\u2015\u2212\s]?\d+\]|\*\*.*?\*\*|`[^`]+`)/gi);

    return parts.map((part, pIdx) => {
      const docMatch = part.match(/\[Doc[-\u2010-\u2015\u2212\s]?(\d+)\]/i);
      if (docMatch) {
        const docNum = parseInt(docMatch[1], 10);
        return (
          <button
            key={pIdx}
            type="button"
            onClick={() => onSelectCitation?.(docNum)}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold bg-white/[0.08] border border-white/[0.14] text-slate-200 hover:bg-white/[0.16] hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all cursor-pointer"
            aria-label={"Doc-" + docNum}
          >
            <span>[Doc-{docNum}]</span>
          </button>
        );
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code key={pIdx} className="px-1.5 py-0.5 rounded-md bg-white/[0.08] font-mono text-[11px] text-slate-200 border border-white/[0.12]">
            {part.slice(1, -1)}
          </code>
        );
      }

      return part;
    });
  };

  if (!isUser && !partsText.trim() && !isStreaming) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-2 my-2">
      {/* Header with Avatar Squircle, Name, Timestamp */}
      <div className="flex items-center gap-2.5 px-1">
        {isUser ? (
          <div className="w-7 h-7 rounded-xl bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-slate-200 font-mono text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            U
          </div>
        ) : (
          <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-[0_2px_12px_rgba(255,255,255,0.18)]">
            <svg className="w-4 h-4 fill-slate-950" viewBox="0 0 24 24">
              <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z" />
            </svg>
          </div>
        )}
        <span className="text-xs font-mono text-slate-400">
          {isUser ? "User • 2:40 pm" : "Nexus AI • 2:40 pm"}
        </span>
      </div>

      {/* Message Card Body (Rich Pronounced Glass Panel) */}
      <div className="rounded-2xl px-4 py-3.5 glass-panel text-slate-100 text-sm leading-relaxed">
        {isUser && attachedFileName && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono bg-white/[0.06] border border-white/[0.12] text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <span>📄</span>
            <span className="font-semibold">Attached: {attachedFileName}{attachedFileSize ? " (" + attachedFileSize + ")" : ""}</span>
          </div>
        )}

        {isUser ? (
          <p className="text-xs sm:text-sm text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
            {cleanUserText || partsText}
          </p>
        ) : !partsText.trim() ? (
          isStreaming ? (
            <div className="flex items-center gap-2.5 py-1 text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
              </span>
              <span className="animate-pulse text-slate-300">Synthesizing response...</span>
            </div>
          ) : null
        ) : (
          renderFormattedContent(partsText)
        )}

        {/* Overlapping 3D Citation Stack */}
        {!isUser && citationMatches.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Verified Sources ({citationMatches.length})
              </span>
              <button
                type="button"
                onClick={() => onSelectCitation?.(citationMatches[0])}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-slate-200 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 cursor-pointer"
              >
                <span>✦ Inspect Citations</span>
              </button>
            </div>

            <div
              onClick={() => onSelectCitation?.(citationMatches[0])}
              className="relative cursor-pointer group mt-2 pt-1.5 pb-1"
            >
              {/* Back Card: -rotate-1.5 */}
              <div className="absolute inset-0 rounded-2xl bg-[#141824]/60 border border-white/[0.06] shadow-md transform -rotate-1.5 group-hover:rotate-0 transition-transform duration-300" />
              {/* Middle Card: rotate-1 */}
              <div className="absolute inset-0 rounded-2xl bg-[#181e2e]/80 border border-white/[0.08] shadow-md transform rotate-1 group-hover:rotate-0 transition-transform duration-300" />
              {/* Front Top Card */}
              <div className="relative rounded-2xl p-3 bg-[#10141e] border border-white/[0.12] shadow-lg flex items-center justify-between group-hover:border-white/[0.22] transition-all duration-300">
                <div className="flex items-center gap-2.5 truncate">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white/[0.08] text-slate-200 border border-white/[0.12]">
                    [Doc-{citationMatches[0]}]
                  </span>
                  <span className="text-xs text-slate-200 truncate font-medium">
                    Verified Enterprise Policy & Governance
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono ml-2 shrink-0 group-hover:text-slate-200 transition-colors">
                  View →
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frosted Action Pills Below Bubble */}
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <button
          type="button"
          onClick={() => handleCopy(cleanUserText || partsText)}
          className={
            copied
              ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-white text-slate-950 border border-white shadow-md transition-all active:scale-95 cursor-pointer"
              : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 active:scale-95 cursor-pointer"
          }
          title={copied ? "Copied to clipboard" : "Copy message"}
          aria-label="Copy message"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-950">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>

        {!isUser && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleFeedback("up")}
              className={"p-1.5 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer " + (feedback === "up" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm" : "text-slate-400 hover:text-slate-200 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] backdrop-blur-md shadow-sm")}
              title="Helpful (+1)"
              aria-label="Thumbs up"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={feedback === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 10v12" />
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleFeedback("down")}
              className={"p-1.5 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer " + (feedback === "down" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm" : "text-slate-400 hover:text-slate-200 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] backdrop-blur-md shadow-sm")}
              title="Issue (-1)"
              aria-label="Thumbs down"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={feedback === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 14V2" />
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
              </svg>
            </button>
          </div>
        )}

        {!isUser && partsText.trim() && (
          <div
            className="relative"
            onMouseEnter={() => setShowTelemetryPopover(true)}
            onMouseLeave={() => setShowTelemetryPopover(false)}
          >
            <button
              type="button"
              onClick={() => setShowTelemetryPopover((p) => !p)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-medium text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 active:scale-95 cursor-pointer"
              title="View latency, token, and cost telemetry"
            >
              <span className="text-slate-400">⚡</span>
              <span>{telemetry.totalTokens} tok</span>
              <span className="text-slate-500">·</span>
              <span>{telemetry.latencyMs}ms</span>
            </button>

            {showTelemetryPopover && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-72 p-3.5 rounded-2xl border border-white/[0.12] shadow-2xl text-xs space-y-2.5 bg-[#10131b]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08] font-mono text-[11px]">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <span>⚡</span> Execution Telemetry
                  </span>
                  <span className="text-slate-400">{telemetry.speed}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col">
                    <span className="text-slate-400">Prompt Tokens</span>
                    <span className="text-white font-bold">{telemetry.promptTokens}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col">
                    <span className="text-slate-400">Output Tokens</span>
                    <span className="text-slate-200 font-bold">{telemetry.completionTokens}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col">
                    <span className="text-slate-400">TTFT Latency</span>
                    <span className="text-slate-200 font-bold">{telemetry.latencyMs} ms</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col">
                    <span className="text-slate-400">Est. Cost</span>
                    <span className="text-emerald-400 font-bold">${telemetry.cost}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-white/[0.08] flex items-center justify-between">
                  <span>Engine:</span>
                  <span className="text-slate-300 truncate max-w-[160px]">{telemetry.engine}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
