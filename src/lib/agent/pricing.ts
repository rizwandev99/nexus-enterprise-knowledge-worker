// src/lib/agent/pricing.ts

export type SupportedModelId =
  | "groq-llama-3.3-70b"
  | "gpt-4o"
  | "claude-3-5-sonnet"
  | "deepseek-r1";

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_PRICING: Record<SupportedModelId | string, ModelPricing> = {
  "groq-llama-3.3-70b": {
    inputPerMillion: 0.59,
    outputPerMillion: 0.79,
  },
  "gpt-4o": {
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
  },
  "claude-3-5-sonnet": {
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
  },
  "deepseek-r1": {
    inputPerMillion: 0.55,
    outputPerMillion: 2.19,
  },
};

export interface TokenCostEstimate {
  promptCost: number;
  completionCost: number;
  totalCost: number;
}

export interface TelemetryCitation {
  id: string;
  title: string;
  content: string;
  uri: string;
}

export interface TelemetryMetrics {
  modelId: string;
  resolvedModelId?: string;
  provider?: string;
  ttftMs: number;
  totalDurationMs: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  costUsd: number;
  citations: TelemetryCitation[];
  timestamp: string;
}

/**
 * Estimates token count from text using character heuristic (~4 characters per token).
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Estimates token cost in USD based on the model pricing table.
 */
export function estimateTokenCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): TokenCostEstimate {
  const pricing = MODEL_PRICING[modelId] ?? MODEL_PRICING["groq-llama-3.3-70b"];
  const promptCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;
  const totalCost = promptCost + completionCost;

  return {
    promptCost: Number(promptCost.toFixed(6)),
    completionCost: Number(completionCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
  };
}
