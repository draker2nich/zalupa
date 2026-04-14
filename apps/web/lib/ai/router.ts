export type AITier = "fast" | "medium" | "pro";
export type AIAction =
  | "reply"
  | "deeper"
  | "angle"
  | "summary"
  | "analysis"
  | "patterns"
  | "weekly_report";

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

const MODEL_MAP: Record<AITier, ModelConfig> = {
  fast: {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 300,
    temperature: 0.7,
  },
  medium: {
    model: "claude-sonnet-4-6",
    maxTokens: 500,
    temperature: 0.7,
  },
  pro: {
    model: "claude-sonnet-4-6",
    maxTokens: 1000,
    temperature: 0.6,
  },
};

const ACTION_TIER_MAP: Record<AIAction, AITier> = {
  reply: "fast",
  deeper: "medium",
  angle: "medium",
  summary: "medium",
  analysis: "pro",
  patterns: "pro",
  weekly_report: "pro",
};

export function getModelConfig(
  action: AIAction,
  override?: string
): ModelConfig {
  if (override && override !== "auto") {
    return { model: override, maxTokens: 500, temperature: 0.7 };
  }
  return MODEL_MAP[ACTION_TIER_MAP[action] || "medium"];
}

export function estimateCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): number {
  const rates: Record<string, { in: number; out: number }> = {
    "claude-haiku-4-5-20251001": {
      in: 0.8 / 1_000_000,
      out: 4.0 / 1_000_000,
    },
    "claude-sonnet-4-6": { in: 3.0 / 1_000_000, out: 15.0 / 1_000_000 },
  };
  const rate = rates[model] || rates["claude-sonnet-4-6"];
  return tokensIn * rate.in + tokensOut * rate.out;
}