import { AI_PROVIDERS_REGISTRY } from './ai-providers.registry';
import type { OpenAiCompatMessage } from './openai-message.model';
import { buildTutorSystemPrompt } from '../tutor/tutor-prompt';

export const OPENAI_MAX_HISTORY_LENGTH = 10;
export const OPENAI_MAX_CONTENT_LENGTH = 1500;

/** Builds the OpenAI-compatible message list (system + trimmed history + new). */
export function buildOpenAiMessages(
  history: { role: 'user' | 'model'; text: string }[],
  newMessage: string,
  targetLanguage: string,
): OpenAiCompatMessage[] {
  const trimmed = history.slice(-OPENAI_MAX_HISTORY_LENGTH).map((msg) => ({
    role: (msg.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: (msg.text || '').slice(0, OPENAI_MAX_CONTENT_LENGTH),
  }));
  return [
    { role: 'system', content: buildTutorSystemPrompt(targetLanguage) },
    ...trimmed,
    {
      role: 'user',
      content: (newMessage || '').slice(0, OPENAI_MAX_CONTENT_LENGTH),
    },
  ];
}

export interface ResolvedOpenAiTarget {
  resolvedId: string;
  label: string;
  model: string;
  apiKey: string;
  chatUrl?: string;
  chatApi: string;
}

/** Resolves provider config + model + key, or an error message string. */
export function resolveOpenAiTarget(
  providerId: string,
  modelOverride?: string,
  customApiKey?: string,
): ResolvedOpenAiTarget | { error: string } {
  const resolvedId =
    providerId === 'default' ? process.env['AI_PROVIDER'] || 'gemini' : providerId;
  const config = AI_PROVIDERS_REGISTRY[resolvedId];
  if (!config) return { error: `Provider "${providerId}" is not configured.` };
  const apiKey = customApiKey || process.env[config.keyEnv] || '';
  if (!apiKey) {
    return {
      error: `No API key configured for ${config.label}. Please add your key in Settings > AI Model.`,
    };
  }
  return {
    resolvedId,
    label: config.label,
    model: modelOverride || config.defaultModel,
    apiKey,
    chatUrl: config.chatUrl,
    chatApi: config.chatApi,
  };
}
