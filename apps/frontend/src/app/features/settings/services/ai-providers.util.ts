/** AI provider metadata + pure provider helpers (plan-001 T95 split). */

export type AiProvider = string;

export interface ProviderInfo {
  id: string;
  label: string;
  description: string;
  quotaBadge?: string;
  consoleUrl: string;
}

// Provider metadata (static config: label, console URL). Models are live-only.
export const KNOWN_PROVIDERS: ProviderInfo[] = [
  {
    id: 'groq',
    label: 'Groq',
    description: 'Ultra-fast inference engine',
    quotaBadge: 'Free Tier',
    consoleUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Google AI multimodal reasoning',
    quotaBadge: 'Free Tier',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o & GPT-4o-mini models',
    consoleUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude 3.5 Sonnet & Haiku models',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    description: 'Mistral Small & Large reasoning models',
    quotaBadge: 'Free Tier',
    consoleUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek-V3 & DeepSeek-R1 reasoning',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'qwen',
    label: 'Qwen',
    description: 'Alibaba Cloud Qwen multilingual models',
    quotaBadge: 'Free Tier',
    consoleUrl: 'https://dashscope.console.aliyun.com/apiKey',
  },
];

/**
 * Resolve a provider id to the actual provider for API calls.
 * 'default' means the server default: fetch all providers.
 */
export function resolveActiveProvider(providerId: string): string | null {
  return providerId === 'default' ? null : providerId;
}

export function findProviderInfo(
  providers: ProviderInfo[],
  id: string,
): ProviderInfo | undefined {
  return providers.find((p) => p.id === id);
}
