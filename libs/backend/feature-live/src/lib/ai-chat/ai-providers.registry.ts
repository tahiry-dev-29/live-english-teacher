export interface AiProviderConfig {
  id: string;
  label: string;
  chatApi: 'openai-compatible' | 'anthropic' | 'google';
  modelsUrl?: string;
  chatUrl?: string;
  keyHeader: string;
  keyEnv: string;
  consoleUrl: string;
  docPath?: string;
  defaultModel: string;
  description: string;
  quotaBadge?: string;
}

export const AI_PROVIDERS_REGISTRY: Record<string, AiProviderConfig> = {
  groq: {
    id: 'groq',
    label: 'Groq',
    chatApi: 'openai-compatible',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    chatUrl: 'https://api.groq.com/openai/v1/chat/completions',
    keyHeader: 'x-groq-api-key',
    keyEnv: 'GROQ_API_KEY',
    consoleUrl: 'https://console.groq.com/keys',
    defaultModel: 'llama-3.3-70b-versatile',
    description: 'Ultra-fast inference engine',
    quotaBadge: 'Free Tier',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    chatApi: 'google',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    keyHeader: 'x-gemini-api-key',
    keyEnv: 'GEMINI_API_KEY',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    defaultModel: 'gemini-2.5-flash',
    description: 'Google AI multimodal reasoning',
    quotaBadge: 'Free Tier',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    chatApi: 'openai-compatible',
    modelsUrl: 'https://api.openai.com/v1/models',
    chatUrl: 'https://api.openai.com/v1/chat/completions',
    keyHeader: 'x-openai-api-key',
    keyEnv: 'OPENAI_API_KEY',
    consoleUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
    description: 'GPT-4o & GPT-4o-mini models',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    chatApi: 'anthropic',
    modelsUrl: 'https://api.anthropic.com/v1/models',
    chatUrl: 'https://api.anthropic.com/v1/messages',
    keyHeader: 'x-anthropic-api-key',
    keyEnv: 'ANTHROPIC_API_KEY',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-3-5-sonnet-20241022',
    description: 'Claude 3.5 Sonnet & Haiku models',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral AI',
    chatApi: 'openai-compatible',
    modelsUrl: 'https://api.mistral.ai/v1/models',
    chatUrl: 'https://api.mistral.ai/v1/chat/completions',
    keyHeader: 'x-mistral-api-key',
    keyEnv: 'MISTRAL_API_KEY',
    consoleUrl: 'https://console.mistral.ai/api-keys',
    defaultModel: 'mistral-small-latest',
    description: 'Mistral Small & Large reasoning models',
    quotaBadge: 'Free Tier',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    chatApi: 'openai-compatible',
    modelsUrl: 'https://api.deepseek.com/models',
    chatUrl: 'https://api.deepseek.com/chat/completions',
    keyHeader: 'x-deepseek-api-key',
    keyEnv: 'DEEPSEEK_API_KEY',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    defaultModel: 'deepseek-chat',
    description: 'DeepSeek-V3 & DeepSeek-R1 reasoning',
  },
  qwen: {
    id: 'qwen',
    label: 'Qwen / DashScope',
    chatApi: 'openai-compatible',
    modelsUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models',
    chatUrl:
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
    keyHeader: 'x-qwen-api-key',
    keyEnv: 'DASHSCOPE_API_KEY',
    consoleUrl: 'https://dashscope.console.aliyun.com/apiKey',
    defaultModel: 'qwen-plus',
    description: 'Alibaba Cloud Qwen multilingual models',
    quotaBadge: 'Free Tier',
  },
};

// NOTE: No FALLBACK_MODELS here by design.
// All chat models must come from live provider APIs (they change monthly).
// When no API key is available, AiModelsService returns [] so the UI
// shows "add key to discover live models" instead of stale mocks.
