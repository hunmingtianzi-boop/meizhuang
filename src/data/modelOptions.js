export const MODEL_PROVIDERS = [
  {
    id: "alibaba",
    label: "阿里百炼",
    models: [
      { id: "qwen-vl-plus", label: "Qwen VL Plus" },
      { id: "qwen-vl-max", label: "Qwen VL Max" },
      { id: "qwen3-vl-plus", label: "Qwen3 VL Plus" },
      { id: "qwen3-vl-max", label: "Qwen3 VL Max" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    models: [
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: [{ id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" }],
  },
];

export function getProvider(providerId) {
  return MODEL_PROVIDERS.find((provider) => provider.id === providerId) || MODEL_PROVIDERS[0];
}
