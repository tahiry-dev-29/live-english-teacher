import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export interface StreamHistoryItem {
  role: 'user' | 'model';
  text: string;
}

/** Validated payload for POST /api/ai/chat/stream (SSE). */
export class StreamChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsArray()
  history?: StreamHistoryItem[];

  @IsOptional()
  @IsString()
  targetLanguage?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  /**
   * Invisible LLM-only context (profile/memories/#tags): used for
   * generation, never stored — history keeps the raw message.
   */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  context?: string;
}

/** Header API keys forwarded per provider for the stream route. */
export interface StreamProviderKeys {
  groqApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  mistralApiKey?: string;
  deepseekApiKey?: string;
  qwenApiKey?: string;
  providerApiKey?: string;
}

/** Resolves the caller key for the active provider (header override wins). */
export function resolveStreamApiKey(
  activeProvider: string,
  keys: StreamProviderKeys,
): string | undefined {
  const byProvider: Record<string, string | undefined> = {
    groq: keys.groqApiKey,
    gemini: keys.geminiApiKey,
    openai: keys.openaiApiKey,
    anthropic: keys.anthropicApiKey,
    mistral: keys.mistralApiKey,
    deepseek: keys.deepseekApiKey,
    qwen: keys.qwenApiKey,
  };
  return keys.providerApiKey || byProvider[activeProvider];
}

/** Header API keys accepted by GET /api/ai/models. */
export interface ModelsHeaderKeys {
  groqApiKey?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  mistralApiKey?: string;
  deepseekApiKey?: string;
  qwenApiKey?: string;
  headerProvider?: string;
}

export interface ResolvedModelsQuery {
  provider?: string;
  keys: Record<string, string>;
  groqApiKey?: string;
  geminiApiKey?: string;
}

/** Normalizes the models-route headers into the service query shape. */
export function resolveModelsQuery(
  headers: ModelsHeaderKeys,
): ResolvedModelsQuery {
  const keys: Record<string, string> = {};
  if (headers.groqApiKey) keys['groq'] = headers.groqApiKey;
  if (headers.geminiApiKey) keys['gemini'] = headers.geminiApiKey;
  if (headers.openaiApiKey) keys['openai'] = headers.openaiApiKey;
  if (headers.anthropicApiKey) keys['anthropic'] = headers.anthropicApiKey;
  if (headers.mistralApiKey) keys['mistral'] = headers.mistralApiKey;
  if (headers.deepseekApiKey) keys['deepseek'] = headers.deepseekApiKey;
  if (headers.qwenApiKey) keys['qwen'] = headers.qwenApiKey;
  const provider =
    headers.headerProvider && headers.headerProvider !== 'default'
      ? headers.headerProvider
      : undefined;
  return {
    provider,
    keys,
    groqApiKey: headers.groqApiKey,
    geminiApiKey: headers.geminiApiKey,
  };
}
