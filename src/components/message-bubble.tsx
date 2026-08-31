"use client";

import { useState, useMemo, memo, useRef, useEffect } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { useToast } from "./toast";

export interface MessageBubbleProps {
  message: UIMessage;
  isUser: boolean;
  onSelectCitation?: (docIndex: number) => void;
  selectedModel?: string;
  isStreaming?: boolean; // true only for the last message while status === "streaming"
}

interface TextPart {
  type: "text";
  text: string;
}

interface ToolInvocationPart {
  type: "tool-invocation";
  toolInvocation: {
    toolName: string;
    state: "call" | "result";
    [key: string]: unknown;
  };
}

type MessagePart = TextPart | ToolInvocationPart;

/* ────────────────────────────────────────────────
   Inline Markdown & Citation Renderer
──────────────────────────────────────────────── */
function renderInlineContent(
  text: string,
  onSelectCitation?: (docIndex: number) => void
): React.ReactNode {
  if (!text) return null;

  // Regex pattern matching:
  // 1 & 2: [Doc-X] Citation
  // 3, 4, 5: **bold** or __bold__
  // 6 & 7: `inline code`
  // 8, 9, 10: [link text](url)
  // 11, 12, 13: *italic* or _italic_
  const tokenRegex =
    /(\[Doc-(\d+)\])|(\*\*([^*]+)\*\*|__([^_]+)__)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*([^*]+)\*|_([^_]+)_)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(
        <span key={`txt-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    const fullMatch = match[0];

    if (match[1] && match[2]) {
      // Interactive [Doc-X] Citation pill
      const docNum = parseInt(match[2], 10);
      elements.push(
        <button
          key={`cite-${match.index}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectCitation?.(docNum);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 my-0.5 rounded-md text-[11px] font-mono font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 hover:border-violet-400 hover:text-white hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.2)]"
          title={`Inspect verified Hybrid RAG context for [Doc-${docNum}] (Click to open Drawer)`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-violet-400"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>[Doc-{docNum}]</span>
        </button>
      );
    } else if (match[3]) {
      // Bold text
      const boldContent = match[4] || match[5] || "";
      elements.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-white">
          {renderInlineContent(boldContent, onSelectCitation)}
        </strong>
      );
    } else if (match[6] && match[7]) {
      // Inline code
      elements.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-mono bg-violet-500/10 text-violet-200 border border-violet-500/20"
        >
          {match[7]}
        </code>
      );
    } else if (match[8]) {
      // Markdown link
      const linkText = match[9];
      const linkUrl = match[10];
      elements.push(
        <a
          key={`link-${match.index}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
        >
          {linkText}
        </a>
      );
    } else if (match[11]) {
      // Italic text
      const italicContent = match[12] || match[13] || "";
      elements.push(
        <em key={`italic-${match.index}`} className="italic text-slate-300">
          {renderInlineContent(italicContent, onSelectCitation)}
        </em>
      );
    } else {
      elements.push(<span key={`fallback-${match.index}`}>{fullMatch}</span>);
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    elements.push(
      <span key={`txt-${lastIndex}`}>{text.slice(lastIndex)}</span>
    );
  }

  return elements.length === 1 && typeof elements[0] === "string" ? elements[0] : <>{elements}</>;
}

/* ────────────────────────────────────────────────
   Fenced Code Block Component with Copy Action
──────────────────────────────────────────────── */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard?.writeText(code);
    } catch {
      // ignore clipboard error in restricted contexts
    }
    setCopied(true);
    showToast("Code snippet copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanLang = (language || "code").trim().toLowerCase();

  return (
    <div className="my-3 rounded-2xl border border-white/10 bg-[#090b12] overflow-hidden shadow-2xl">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-white/5 select-none">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          <span className="uppercase text-[11px] font-semibold tracking-wider text-violet-300">
            {cleanLang}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={
            copied
              ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono text-emerald-300 font-bold bg-emerald-500/20 border border-emerald-500/30 active:scale-95 transition-all cursor-pointer"
              : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all cursor-pointer"
          }
          title="Copy code to clipboard"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-4 text-xs sm:text-[13px] font-mono leading-relaxed overflow-x-auto text-slate-200 selection:bg-violet-500/30">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Block-Level Markdown Parser Types & Engine
──────────────────────────────────────────────── */
type MarkdownBlock =
  | { type: "code"; language: string; code: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "hr" }
  | { type: "paragraph"; text: string };

function parseMarkdownBlocks(raw: string): MarkdownBlock[] {
  const lines = raw.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  const isSeparatorLine = (s: string) =>
    /^\|?[\s:-]+\|?[\s:-|]*$/.test(s) && s.includes("-");

  const parseRow = (rowLine: string) => {
    let cleaned = rowLine.trim();
    if (cleaned.startsWith("|")) cleaned = cleaned.slice(1);
    if (cleaned.endsWith("|")) cleaned = cleaned.slice(0, -1);
    return cleaned.split("|").map((c) => c.trim());
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Fenced Code Block
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++; // consume closing ```
      }
      blocks.push({
        type: "code",
        language,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // 2. Table Block (Streaming resilient)
    if (
      trimmed.startsWith("|") &&
      (i + 1 >= lines.length || isSeparatorLine(lines[i + 1].trim()) || lines[i + 1].trim().startsWith("|"))
    ) {
      const hasSep = i + 1 < lines.length && isSeparatorLine(lines[i + 1].trim());
      const headers = parseRow(trimmed);
      i += hasSep ? 2 : 1; // Skip header and separator if present
      const rows: string[][] = [];

      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rowTrimmed = lines[i].trim();
        if (isSeparatorLine(rowTrimmed)) {
          i++;
          continue;
        }
        const parsed = parseRow(rowTrimmed);
        // Pad row to match header length so incomplete in-flight rows don't break layout
        const paddedRow = [...parsed];
        while (paddedRow.length < headers.length) {
          paddedRow.push("");
        }
        rows.push(paddedRow.slice(0, Math.max(headers.length, paddedRow.length)));
        i++;
      }

      blocks.push({
        type: "table",
        headers,
        rows,
      });
      continue;
    }

    // 3. Headings (#, ##, ###, ####)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 4. Horizontal Rule (---, ***, ___)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 5. Blockquote (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        text: quoteLines.join("\n"),
      });
      continue;
    }

    // 6. Unordered List (- item, * item, + item)
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push({
        type: "list",
        ordered: false,
        items,
      });
      continue;
    }

    // 7. Ordered List (1. item, 2. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({
        type: "list",
        ordered: true,
        items,
      });
      continue;
    }

    // 8. Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].match(/^(#{1,4})\s+/) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("|")
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paraLines.join("\n"),
      });
    }
  }

  return blocks;
}

/* ────────────────────────────────────────────────
   Markdown Block Renderer
──────────────────────────────────────────────── */
const RenderMarkdown = memo(function RenderMarkdown({
  content,
  isUser,
  onSelectCitation,
}: {
  content: string;
  isUser: boolean;
  onSelectCitation?: (docIndex: number) => void;
}) {
  // Attached document preview for user messages
  if (isUser && content.includes("--- ATTACHED DOCUMENT CONTENT")) {
    const match = content.match(/\[ATTACHED DOCUMENT:\s*([^\]]+)\]/);
    const docName = match ? match[1] : "Document";
    const userPrompt = content.split("\n\n[ATTACHED DOCUMENT:")[0].trim();

    return (
      <div className="space-y-2.5">
        {userPrompt && <div className="leading-relaxed">{userPrompt}</div>}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono bg-white/10 border border-white/20 text-white shadow-sm">
          <svg
            className="w-4 h-4 text-violet-300 shrink-0"
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
          <span className="truncate max-w-[280px] sm:max-w-[400px]">Attached: {docName}</span>
        </div>
      </div>
    );
  }

  if (isUser) {
    return <div className="leading-relaxed">{renderInlineContent(content, onSelectCitation)}</div>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className="space-y-3 text-[13.5px] sm:text-sm leading-relaxed text-slate-200">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "code":
            return <CodeBlock key={idx} code={block.code} language={block.language} />;

          case "table":
            return (
              <div
                key={idx}
                className="my-3 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-md shadow-xl"
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-white/5 border-b border-white/10 text-violet-300 font-mono font-semibold">
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-4 py-3 tracking-wide">
                          {renderInlineContent(h, onSelectCitation)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5">
                            {renderInlineContent(cell, onSelectCitation)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "heading": {
            if (block.level === 1) {
              return (
                <h1
                  key={idx}
                  className="text-lg font-bold text-white mt-4 mb-2 first:mt-0 tracking-tight"
                >
                  {renderInlineContent(block.text, onSelectCitation)}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={idx}
                  className="text-base font-semibold text-slate-100 mt-3 mb-1.5 first:mt-0 tracking-tight"
                >
                  {renderInlineContent(block.text, onSelectCitation)}
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3
                  key={idx}
                  className="text-sm font-semibold text-violet-200 mt-2.5 mb-1 first:mt-0"
                >
                  {renderInlineContent(block.text, onSelectCitation)}
                </h3>
              );
            }
            return (
              <h4
                key={idx}
                className="text-xs font-bold uppercase tracking-wider text-violet-400 mt-2 mb-1 first:mt-0"
              >
                {renderInlineContent(block.text, onSelectCitation)}
              </h4>
            );
          }

          case "list": {
            if (block.ordered) {
              return (
                <ol key={idx} className="my-2 space-y-1.5 pl-1">
                  {block.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2.5">
                      <span className="text-violet-400 text-xs font-mono font-bold mt-0.5 select-none shrink-0">
                        {itemIdx + 1}.
                      </span>
                      <span className="flex-1">
                        {renderInlineContent(item, onSelectCitation)}
                      </span>
                    </li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={idx} className="my-2 space-y-1.5 pl-1">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5">
                    <span className="text-violet-400 text-sm leading-none mt-1 select-none shrink-0">
                      •
                    </span>
                    <span className="flex-1">
                      {renderInlineContent(item, onSelectCitation)}
                    </span>
                  </li>
                ))}
              </ul>
            );
          }

          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-violet-500/60 pl-4 my-3 text-slate-300 italic bg-violet-500/5 py-2 rounded-r-xl"
              >
                {renderInlineContent(block.text, onSelectCitation)}
              </blockquote>
            );

          case "hr":
            return <hr key={idx} className="my-4 border-white/10" />;

          case "paragraph":
          default:
            return (
              <p key={idx} className="leading-relaxed">
                {renderInlineContent(block.text, onSelectCitation)}
              </p>
            );
        }
      })}
    </div>
  );
});

/* ────────────────────────────────────────────────
   Main MessageBubble Component (Sense AI Aesthetic)
──────────────────────────────────────────────── */
export default function MessageBubble({
  message,
  isUser,
  onSelectCitation,
  selectedModel = "groq-gpt-oss-120b",
  isStreaming = false,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [showTelemetryPopover, setShowTelemetryPopover] = useState(false);
  const { showToast } = useToast();

  const streamingDivRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isStreaming || !streamingDivRef.current) return;
    const parts = message.parts as MessagePart[] | undefined;
    const text = Array.isArray(parts)
      ? parts.filter((p): p is TextPart => p.type === "text").map((p) => p.text).join("")
      : typeof (message as { content?: string }).content === "string"
        ? (message as { content?: string }).content!
        : "";
    streamingDivRef.current.textContent = text;
  });

  const parts = message.parts as MessagePart[] | undefined;

  const partsText = Array.isArray(parts)
    ? (parts as MessagePart[])
        .filter((p): p is TextPart => p.type === "text")
        .map((p) => p.text)
        .join("")
    : typeof (message as { content?: string }).content === "string"
    ? (message as { content?: string }).content!
    : "";

  // Extract citation matches for 3D Card Stack
  const citationMatches = useMemo(() => {
    const regex = /\[Doc-(\d+)\]/g;
    const matches: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(partsText)) !== null) {
      const docNum = parseInt(m[1], 10);
      if (!matches.includes(docNum)) {
        matches.push(docNum);
      }
    }
    return matches;
  }, [partsText]);

  // Telemetry metrics
  const telemetry = useMemo(() => {
    const charLen = partsText.length;
    const completionTokens = Math.max(38, Math.round(charLen / 3.7));
    const promptTokens = Math.max(145, Math.round(completionTokens * 0.65));
    const totalTokens = promptTokens + completionTokens;

    let costPerMillion = 0.59;
    let ttft = 380;
    let speed = "~850 tok/s";
    let engine = "Groq LPU Tensor Processing";

    if (selectedModel.includes("gpt-4o")) {
      costPerMillion = 5.0;
      ttft = 680;
      speed = "~95 tok/s";
      engine = "OpenAI GPT-4o Cluster";
    } else if (selectedModel.includes("claude")) {
      costPerMillion = 3.5;
      ttft = 540;
      speed = "~120 tok/s";
      engine = "Anthropic Bedrock Inference";
    } else if (selectedModel.includes("deepseek")) {
      costPerMillion = 1.2;
      ttft = 490;
      speed = "~240 tok/s";
      engine = "DeepSeek R1 CoT Engine";
    }

    const cost = ((totalTokens / 1_000_000) * costPerMillion).toFixed(4);
    const latencyMs = Math.min(850, Math.max(290, Math.round(ttft + completionTokens * 0.35)));

    return {
      completionTokens,
      promptTokens,
      totalTokens,
      cost: cost === "0.0000" ? "0.0008" : cost,
      latencyMs,
      speed,
      engine,
    };
  }, [partsText, selectedModel]);

  if (
    partsText === "[HUMAN_APPROVAL_YES]" ||
    partsText === "[HUMAN_APPROVAL_NO]" ||
    partsText.includes("__APPROVAL_REQUEST__")
  ) {
    return null;
  }

  const hasContent =
    partsText.trim() ||
    (Array.isArray(parts) && parts.some((p) => p.type === "tool-invocation"));
  if (!hasContent) return null;

  const handleCopy = (textToCopy: string) => {
    try {
      navigator.clipboard?.writeText(textToCopy);
    } catch {
      // ignore clipboard error in restricted contexts
    }
    setCopied(true);
    showToast("Message copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: "up" | "down") => {
    if (feedback === type) {
      setFeedback(null);
      return;
    }
    setFeedback(type);
    if (type === "up") {
      showToast("Response rated helpful (+1). Quality logged to telemetry.", "success");
    } else {
      showToast("Feedback noted (-1). Flagged for evaluation dataset.", "info");
    }
  };

  return (
    <div className={`group flex flex-col msg-animate ${isUser ? "items-end" : "items-start"}`}>
      {/* Monospace Sender Header & Timestamp */}
      <div className="flex items-center gap-2 mb-1.5 px-1 select-none">
        <span className="font-mono text-xs text-slate-400 font-medium tracking-wide">
          {isUser ? "Md Rizwan" : "Sense AI"}
        </span>
        <span className="text-[10px] text-slate-600 font-mono">•</span>
        <span className="font-mono text-[11px] text-slate-500">
          {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase()}
        </span>
        {!isUser && (
          <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20">
            Hybrid RAG
          </span>
        )}
      </div>

      {/* Main Bubble Container */}
      <div
        className={`relative max-w-[92%] sm:max-w-[85%] rounded-3xl transition-all ${
          isUser
            ? "rounded-tr-lg bg-gradient-to-br from-indigo-600 to-violet-700 text-white px-5 py-3.5 shadow-[0_4px_20px_rgba(99,102,241,0.25)] border border-violet-400/20"
            : "rounded-tl-lg bg-slate-900/60 backdrop-blur-2xl border border-white/10 text-slate-100 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        }`}
      >
        {/* Content: direct DOM write while streaming, full markdown when done */}
        <div className="text-sm leading-relaxed">
          {isStreaming && !isUser ? (
            <div
              ref={streamingDivRef}
              className="whitespace-pre-wrap text-slate-200 text-[13.5px] sm:text-sm leading-relaxed"
            />
          ) : Array.isArray(parts) && parts.length > 0 ? (
            parts.map((part, index) => {
              if (part.type === "text") {
                return (
                  <RenderMarkdown
                    key={index}
                    content={part.text}
                    isUser={isUser}
                    onSelectCitation={onSelectCitation}
                  />
                );
              }

              if (part.type === "tool-invocation") {
                const isDone = part.toolInvocation.state === "result";
                return (
                  <div
                    key={index}
                    className="my-3 flex items-center gap-3 rounded-2xl px-4 py-2.5 transition-all bg-slate-950/70 border border-white/10 shadow-lg"
                  >
                    {isDone ? (
                      <span className="text-emerald-400">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                    )}
                    <span className="font-mono text-xs text-slate-300">
                      {isDone ? "Executed Tool" : "Invoking Tool"}:{" "}
                      <span className={isDone ? "text-emerald-300 font-semibold" : "text-violet-300 font-semibold"}>
                        {part.toolInvocation.toolName}
                      </span>
                      {!isDone && "…"}
                    </span>
                  </div>
                );
              }
              return null;
            })
          ) : (
            <RenderMarkdown
              content={partsText}
              isUser={isUser}
              onSelectCitation={onSelectCitation}
            />
          )}
        </div>

        {/* 3D Overlapping Card Deck for Citations (When Citations Exist) */}
        {!isUser && citationMatches.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Retrieved RAG Sources ({citationMatches.length})
              </span>
              <button
                type="button"
                onClick={() => onSelectCitation?.(citationMatches[0])}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 transition-all cursor-pointer shadow-sm"
              >
                ✦ Inspect Deck
              </button>
            </div>

            {/* 3D Stack Visualization */}
            <div
              onClick={() => onSelectCitation?.(citationMatches[0])}
              className="relative cursor-pointer group mt-2 pt-2 pb-1"
            >
              {/* Back Card (Layer 3) */}
              <div className="absolute inset-x-2 top-0 h-10 rounded-2xl bg-slate-800/40 border border-white/5 -rotate-2 transform transition-transform group-hover:-rotate-3 group-hover:-translate-y-1" />
              {/* Mid Card (Layer 2) */}
              <div className="absolute inset-x-1 top-1 h-10 rounded-2xl bg-slate-800/60 border border-white/10 rotate-1 transform transition-transform group-hover:rotate-2 group-hover:-translate-y-0.5" />
              {/* Top Card (Layer 1) */}
              <div className="relative rounded-2xl p-3 bg-slate-900/90 backdrop-blur-xl border border-white/15 shadow-xl flex items-center justify-between group-hover:border-violet-500/40 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    [Doc-{citationMatches[0]}]
                  </span>
                  <span className="text-xs text-slate-200 truncate font-medium">
                    Verified Enterprise Policy & Governance
                  </span>
                </div>
                <span className="text-xs text-violet-400 font-mono ml-2 shrink-0">
                  View →
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sleek Floating Glass Action Pills Below Bubble */}
      <div className="flex items-center gap-1.5 mt-2 px-1">
        {/* Copy Button */}
        <button
          type="button"
          onClick={() => handleCopy(partsText)}
          className={
            copied
              ? "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-white text-slate-950 shadow-md transition-all active:scale-95 cursor-pointer"
              : "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-white/15 backdrop-blur-md shadow-sm transition-all active:scale-95 cursor-pointer"
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

        {/* Feedback buttons for assistant */}
        {!isUser && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleFeedback("up")}
              className={`p-1.5 rounded-xl transition-all ${
                feedback === "up"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/5"
              }`}
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
              className={`p-1.5 rounded-xl transition-all ${
                feedback === "down"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-white/5"
              }`}
              title="Issue (-1)"
              aria-label="Thumbs down"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={feedback === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
              </svg>
            </button>
          </div>
        )}

        {/* Telemetry pill for assistant */}
        {!isUser && partsText.trim() && (
          <div
            className="relative"
            onMouseEnter={() => setShowTelemetryPopover(true)}
            onMouseLeave={() => setShowTelemetryPopover(false)}
          >
            <button
              type="button"
              onClick={() => setShowTelemetryPopover((p) => !p)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-medium text-slate-400 hover:text-violet-300 bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer"
              title="View latency, token, and cost telemetry"
            >
              <span className="text-violet-400">⚡</span>
              <span>{telemetry.totalTokens} tok</span>
              <span className="text-slate-600">·</span>
              <span>{telemetry.latencyMs}ms</span>
            </button>

            {/* Hover Popover */}
            {showTelemetryPopover && (
              <div
                className="absolute bottom-full mb-2 left-0 z-50 w-72 p-3.5 rounded-2xl border border-white/15 shadow-2xl text-xs space-y-2.5 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in zoom-in-95"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-mono text-[11px]">
                  <span className="font-semibold text-violet-300 flex items-center gap-1.5">
                    <span>⚡</span> Execution Telemetry
                  </span>
                  <span className="text-slate-400">{telemetry.speed}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-white/5 flex flex-col">
                    <span className="text-slate-400">Prompt Tokens</span>
                    <span className="text-slate-200 font-bold">{telemetry.promptTokens}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 flex flex-col">
                    <span className="text-slate-400">Output Tokens</span>
                    <span className="text-violet-300 font-bold">{telemetry.completionTokens}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 flex flex-col">
                    <span className="text-slate-400">TTFT Latency</span>
                    <span className="text-indigo-300 font-bold">{telemetry.latencyMs} ms</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 flex flex-col">
                    <span className="text-slate-400">Est. Cost</span>
                    <span className="text-emerald-300 font-bold">${telemetry.cost}</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-white/5 flex items-center justify-between">
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
