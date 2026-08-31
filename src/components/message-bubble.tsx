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
    return (
      message.parts
        ?.map((p) => {
          if (p.type === "text") return p.text;
          return "";
        })
        .join("") || ""
    );
  }, [message.parts]);

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
    const re = /\[Doc-(\d+)\]/g;
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
    const codeBlockRegex = /`([a-zA-Z0-9_-]*)\n([\s\S]*?)`/g;
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
            className="my-3 rounded-2xl overflow-hidden border border-slate-700/50 bg-[#181c26] text-xs font-mono shadow-md"
          >
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#202736]/90 border-b border-slate-700/50 text-[11px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">{block.language}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(block.content, bIdx)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors cursor-pointer"
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
        <div key={"tbl-" + k} className="my-3 overflow-x-auto rounded-2xl border border-slate-700/50 bg-[#181c26]/90 shadow-md">
          <table className="w-full text-xs text-left text-slate-200">
            <thead className="text-[11px] uppercase tracking-wider font-mono bg-[#202736] text-slate-300 border-b border-slate-700/50">
              <tr>
                {header.map((col, idx) => (
                  <th key={idx} className="px-3.5 py-2.5 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {bodyRows.map((row, rIdx) => {
                const paddedRow = [...row];
                while (paddedRow.length < colCount) {
                  paddedRow.push("...");
                }
                return (
                  <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
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
    const parts = text.split(/(\[Doc-\d+\]|\*\*.*?\*\*|`[^`]+`)/g);

    return parts.map((part, pIdx) => {
      const docMatch = part.match(/\[Doc-(\d+)\]/);
      if (docMatch) {
        const docNum = parseInt(docMatch[1], 10);
        return (
          <button
            key={pIdx}
            type="button"
            onClick={() => onSelectCitation?.(docNum)}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
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
          <code key={pIdx} className="px-1.5 py-0.5 rounded-md bg-slate-800 font-mono text-[11px] text-slate-200 border border-slate-700/60">
            {part.slice(1, -1)}
          </code>
        );
      }

      return part;
    });
  };

  return (
    <div className="w-full flex flex-col gap-2 my-2">
      {/* Header with Avatar Squircle, Name, Timestamp */ }
      <div className="flex items-center gap-2.5 px-1">
        {isUser ? (
          <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 font-mono text-xs font-semibold shadow-sm">
            MR
          </div>
        ) : (
          <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 fill-slate-950" viewBox="0 0 32 32">
              <path d="M16 3.5C14.3 3.5 13.1 5.8 12.5 8.8 11.7 12.3 8.8 15.2 5.2 15.9c-1.2.2-1.2 2 0 2.2 3.6.7 6.5 3.6 7.3 7.1.6 3 1.8 5.3 3.5 5.3s2.9-2.3 3.5-5.3c.8-3.5 3.7-6.4 7.3-7.1 1.2-.2 1.2-2 0-2.2-3.6-.7-6.5-3.6-7.3-7.1-.6-3-1.8-5.3-3.5-5.3z" />
            </svg>
          </div>
        )}
        <span className="text-xs font-semibold text-white tracking-tight">
          {isUser ? "Md Rizwan" : "Sense AI"}
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          2:40 pm
        </span>
      </div>

      {/* Message Card Body (#202736 dark slate card) */ }
      <div className="rounded-2xl p-4 bg-[#202736]/80 border border-slate-700/50 shadow-lg text-slate-200">
        {isUser && attachedFileName && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono bg-slate-800 border border-slate-700 text-slate-200">
            <span>📄</span>
            <span className="font-semibold">Attached: {attachedFileName}{attachedFileSize ? " (" + attachedFileSize + ")" : ""}</span>
          </div>
        )}

        {isUser ? (
          <p className="text-xs sm:text-sm text-slate-100 font-sans leading-relaxed whitespace-pre-wrap">
            {cleanUserText || partsText}
          </p>
        ) : (
          renderFormattedContent(partsText)
        )}

        {/* Overlapping 3D Fan-out Citation Stack */ }
        {!isUser && citationMatches.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-700/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Verified Sources ({citationMatches.length})
              </span>
              <button
                type="button"
                onClick={() => onSelectCitation?.(citationMatches[0])}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono bg-slate-800/90 border border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-700/90 transition-all cursor-pointer"
              >
                <span>✦ Inspect Citations</span>
              </button>
            </div>

            <div
              onClick={() => onSelectCitation?.(citationMatches[0])}
              className="relative cursor-pointer group mt-2 pt-1"
            >
              <div className="absolute inset-x-2 top-2 h-10 rounded-2xl bg-slate-800/40 border border-slate-700/30 transform transition-transform group-hover:translate-x-1.5" />
              <div className="absolute inset-x-1 top-1 h-10 rounded-2xl bg-slate-800/70 border border-slate-700/50 transform transition-transform group-hover:translate-x-0.5" />
              <div className="relative rounded-2xl p-3 bg-[#202736] border border-slate-700/60 shadow-md flex items-center justify-between group-hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                    [Doc-{citationMatches[0]}]
                  </span>
                  <span className="text-xs text-slate-200 truncate font-medium">
                    Verified Enterprise Policy & Governance
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono ml-2 shrink-0">
                  View →
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frosted Action Pills Below Bubble */ }
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <button
          type="button"
          onClick={() => handleCopy(cleanUserText || partsText)}
          className={
            copied
              ? "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-white text-slate-950 shadow-md transition-all active:scale-95 cursor-pointer"
              : "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono text-slate-400 hover:text-white bg-[#202736]/70 hover:bg-[#283144] border border-slate-700/50 backdrop-blur-md shadow-sm transition-all active:scale-95 cursor-pointer"
          }
          title={copied ? "Copied to clipboard" : "Copy message"}
          aria-label="Copy message"
        >
          {copied ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-950">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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
              className={"p-1.5 rounded-xl transition-all " + (feedback === "up" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white bg-[#202736]/70 hover:bg-[#283144] border border-slate-700/50")}
              title="Helpful (+1)"
              aria-label="Thumbs up"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={feedback === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleFeedback("down")}
              className={"p-1.5 rounded-xl transition-all " + (feedback === "down" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "text-slate-400 hover:text-white bg-[#202736]/70 hover:bg-[#283144] border border-slate-700/50")}
              title="Issue (-1)"
              aria-label="Thumbs down"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={feedback === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-medium text-slate-400 hover:text-white bg-[#202736]/70 hover:bg-[#283144] border border-slate-700/50 transition-all cursor-pointer"
              title="View latency, token, and cost telemetry"
            >
              <span className="text-slate-400">⚡</span>
              <span>{telemetry.totalTokens} tok</span>
              <span className="text-slate-600">·</span>
              <span>{telemetry.latencyMs}ms</span>
            </button>

            {showTelemetryPopover && (
              <div className="absolute bottom-full mb-2 left-0 z-50 w-72 p-3.5 rounded-2xl border border-slate-700/60 shadow-2xl text-xs space-y-2.5 bg-[#181c26] backdrop-blur-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/50 font-mono text-[11px]">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <span>⚡</span> Execution Telemetry
                  </span>
                  <span className="text-slate-400">{telemetry.speed}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-col">
                    <span className="text-slate-400">Prompt Tokens</span>
                    <span className="text-white font-bold">{telemetry.promptTokens}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-col">
                    <span className="text-slate-400">Output Tokens</span>
                    <span className="text-slate-200 font-bold">{telemetry.completionTokens}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-col">
                    <span className="text-slate-400">TTFT Latency</span>
                    <span className="text-slate-200 font-bold">{telemetry.latencyMs} ms</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 flex flex-col">
                    <span className="text-slate-400">Est. Cost</span>
                    <span className="text-emerald-400 font-bold"></span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-700/50 flex items-center justify-between">
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
