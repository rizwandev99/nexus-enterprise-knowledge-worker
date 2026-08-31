"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface ModelOption {
  id: string;
  name: string;
  provider: "Groq" | "OpenAI" | "Anthropic" | "DeepSeek";
  speedBadge: string;
  speedToks: string;
  description: string;
  tag?: string;
  badgeClass: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "groq-gpt-oss-120b",
    name: "Groq GPT-OSS 120B",
    provider: "Groq",
    speedBadge: "Lightning Fast",
    speedToks: "~850 tok/s",
    description: "Flagship 120B open-weights model on Groq LPU with fast tool calling",
    tag: "Default",
    badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  },
  {
    id: "groq-qwen-3.8-27b",
    name: "Groq Qwen 3.8 27B",
    provider: "Groq",
    speedBadge: "Ultra Speed",
    speedToks: "~1200 tok/s",
    description: "High-speed dense reasoning model optimized for sub-second latency",
    tag: "Fast",
    badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    provider: "OpenAI",
    speedBadge: "Frontier Reasoning",
    speedToks: "~95 tok/s",
    description: "State-of-the-art multimodal reasoning and complex planning",
    tag: "Omni",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    speedBadge: "Coding & Analysis",
    speedToks: "~120 tok/s",
    description: "Industry-leading agentic tool use and nuanced code synthesis",
    tag: "Top Tier",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    speedBadge: "Deep Chain of Thought",
    speedToks: "~240 tok/s",
    description: "Reinforcement-learned reasoning with internal verification steps",
    tag: "Reasoning",
    badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
];

export interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  compact?: boolean;
  align?: "left" | "right" | "top";
}

export default function ModelSelector({
  selectedModel,
  onSelectModel,
  compact = false,
  align = "top",
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = useCallback(
    (modelId: string) => {
      onSelectModel(modelId);
      setIsOpen(false);
    },
    [onSelectModel]
  );

  const renderProviderIcon = (provider: ModelOption["provider"]) => {
    switch (provider) {
      case "Groq":
        return (
          <svg className="w-3.5 h-3.5 text-teal-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        );
      case "OpenAI":
        return (
          <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947z" />
          </svg>
        );
      case "Anthropic":
        return (
          <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        );
      case "DeepSeek":
        return (
          <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        );
    }
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-2 rounded-full border transition-all duration-200 cursor-pointer ${
          compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"
        } ${
          isOpen
            ? "bg-white/10 border-teal-500/50 text-white shadow-[0_0_15px_rgba(20,184,166,0.25)]"
            : "bg-[#181a24] border-white/10 text-gray-300 hover:text-white hover:border-white/20 hover:bg-[#1e212e]"
        }`}
        title="Select AI Inference Engine"
      >
        <span className="shrink-0">{renderProviderIcon(activeModel.provider)}</span>

        <span className="font-medium truncate max-w-[130px] sm:max-w-[170px]">
          {activeModel.name}
        </span>

        {/* Speed / Badge Pill */}
        <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
          {activeModel.speedToks}
        </span>

        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-teal-300" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 w-72 sm:w-80 rounded-2xl p-1.5 shadow-2xl border border-white/10 transition-all duration-200 animate-in fade-in zoom-in-95 ${
            align === "top"
              ? "bottom-full mb-2 left-0"
              : align === "right"
              ? "top-full mt-2 right-0"
              : "top-full mt-2 left-0"
          }`}
          style={{
            background: "linear-gradient(180deg, rgba(19, 21, 31, 0.98) 0%, rgba(12, 13, 19, 0.98) 100%)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(20, 184, 166, 0.1)",
          }}
        >
          {/* Menu Header */}
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between mb-1">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-gray-400">
              Inference Model
            </span>
            <span className="text-[10px] text-teal-400 font-mono">
              Enterprise Multi-Provider
            </span>
          </div>

          {/* Model Options List */}
          <div className="space-y-1">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = model.id === selectedModel;
              return (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(model.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all duration-150 flex flex-col gap-1 cursor-pointer group ${
                    isSelected
                      ? "bg-teal-500/10 border border-teal-500/30 text-white shadow-sm"
                      : "hover:bg-white/5 border border-transparent text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{renderProviderIcon(model.provider)}</span>
                      <span
                        className={`text-xs font-semibold tracking-tight ${
                          isSelected ? "text-teal-300" : "text-gray-100 group-hover:text-white"
                        }`}
                      >
                        {model.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${model.badgeClass}`}
                      >
                        {model.speedBadge}
                      </span>

                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-teal-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Description & Speed */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 pl-5.5">
                    <span className="truncate pr-2 text-gray-400 group-hover:text-gray-300">
                      {model.description}
                    </span>
                    <span className="font-mono text-gray-500 text-[10px] shrink-0">
                      {model.speedToks}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
