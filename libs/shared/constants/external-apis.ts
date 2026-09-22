/**
 * External API Provider Constants
 *
 * Centralized configuration for third-party AI providers.
 * Exports pure config objects (no process.env access) that can be safely
 * imported by both frontend and backend.
 * Env var names are stored as strings; consumers read process.env themselves.
 */

// ============================================
// Google Gemini
// ============================================
export const GEMINI_CONFIG = {
  /** Base URL for Gemini REST API */
  apiBaseUrl:
    'https://generativelanguage.googleapis.com/v1beta/models/' as const,

  /** Default chat model */
  defaultChatModel: 'gemini-2.5-flash' as const,

  /** Default TTS model */
  defaultTtsModel: 'gemini-2.5-flash-preview-tts' as const,

  /** Environment variable name for API key */
  apiKeyEnv: 'GEMINI_API_KEY' as const,

  /** Optional custom base URL override (e.g., for proxy) */
  customBaseUrlEnv: 'apiUrlBase' as const,

  /** Build generateContent URL */
  buildGenerateUrl(model: string, apiKey: string, customBase?: string): string {
    const base = customBase || this.apiBaseUrl;
    return `${base}${model}:generateContent?key=${apiKey}`;
  },

  /** Build streamGenerateContent URL */
  buildStreamUrl(model: string, apiKey: string, customBase?: string): string {
    const base = customBase || this.apiBaseUrl;
    return `${base}${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  },
} as const;

// ============================================
// Groq
// ============================================
export const GROQ_CONFIG = {
  /** Base URL for Groq OpenAI-compatible API */
  apiBaseUrl: 'https://api.groq.com/openai/v1/chat/completions' as const,

  /** Default model */
  defaultModel: 'llama-3.1-8b-instant' as const,

  /** Fallback model */
  fallbackModel: 'llama-3.1-8b-instant' as const,

  /** Environment variable name for API key */
  apiKeyEnv: 'GROQ_API_KEY' as const,

  /** Environment variable name for model override */
  modelEnv: 'AI_MODEL' as const,

  /** Environment variable name for fallback model override */
  fallbackModelEnv: 'AI_FALLBACK_MODEL' as const,

  /** Max history length for context */
  maxHistoryLength: 10,

  /** Max content length per message */
  maxContentLength: 1500,
} as const;

// ============================================
// OpenAI (for future use / TTS)
// ============================================
export const OPENAI_CONFIG = {
  apiBaseUrl: 'https://api.openai.com/v1' as const,
  apiKeyEnv: 'OPENAI_API_KEY' as const,
  defaultChatModel: 'gpt-4o-mini' as const,
  defaultTtsModel: 'tts-1' as const,
  defaultTtsVoice: 'alloy' as const,
} as const;

// ============================================
// Anthropic (for future use)
// ============================================
export const ANTHROPIC_CONFIG = {
  apiBaseUrl: 'https://api.anthropic.com/v1' as const,
  apiKeyEnv: 'ANTHROPIC_API_KEY' as const,
  defaultModel: 'claude-3-5-sonnet-20241022' as const,
} as const;

// ============================================
// Mistral (for future use)
// ============================================
export const MISTRAL_CONFIG = {
  apiBaseUrl: 'https://api.mistral.ai/v1' as const,
  apiKeyEnv: 'MISTRAL_API_KEY' as const,
  defaultModel: 'mistral-small-latest' as const,
} as const;

// ============================================
// DeepSeek (for future use)
// ============================================
export const DEEPSEEK_CONFIG = {
  apiBaseUrl: 'https://api.deepseek.com/v1' as const,
  apiKeyEnv: 'DEEPSEEK_API_KEY' as const,
  defaultModel: 'deepseek-chat' as const,
} as const;

// ============================================
// Qwen (for future use)
// ============================================
export const QWEN_CONFIG = {
  apiBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' as const,
  apiKeyEnv: 'QWEN_API_KEY' as const,
  defaultModel: 'qwen-plus' as const,
} as const;

// ============================================
// Type-safe provider registry
// ============================================
export const EXTERNAL_PROVIDERS = {
  gemini: GEMINI_CONFIG,
  groq: GROQ_CONFIG,
  openai: OPENAI_CONFIG,
  anthropic: ANTHROPIC_CONFIG,
  mistral: MISTRAL_CONFIG,
  deepseek: DEEPSEEK_CONFIG,
  qwen: QWEN_CONFIG,
} as const;

export type ProviderId = keyof typeof EXTERNAL_PROVIDERS;
export type ProviderConfig = (typeof EXTERNAL_PROVIDERS)[ProviderId];

// ============================================
// Helper: Get provider config by ID
// ============================================
export function getProviderConfig(provider: ProviderId): ProviderConfig {
  return EXTERNAL_PROVIDERS[provider];
}

// ============================================
// Helper: Read env var by provider (backend/Node.js only)
// ============================================
export function getProviderApiKey(provider: ProviderId): string | undefined {
  const config = getProviderConfig(provider);
  return typeof process !== 'undefined'
    ? process.env[config.apiKeyEnv]
    : undefined;
}
