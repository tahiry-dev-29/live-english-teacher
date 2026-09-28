import { Injectable, inject } from '@angular/core';
import { MESSAGES, MESSAGE_TEMPLATES } from '@core/constants/messages';
import { formatApiError } from '@core/utils/api-error.util';
import { AiConfigService } from '@features/settings/services/ai-config.service';
import { ApiKeyService } from '@features/settings/services/api-key.service';
import { API_URLS } from '@shared/constants/api-config';

export interface StreamChatRequest {
  message: string;
  sessionId: string | null;
  targetLanguage: string;
  /** Invisible LLM-only context (profile/memories/#tags) — never stored. */
  context?: string;
}

export interface StreamChatError {
  code: string;
  message: string;
  provider: string | null;
}

export interface StreamChatResult {
  text: string;
  sessionId: string | null;
  title: string | null;
  error: StreamChatError | null;
}

interface StreamPayload {
  sessionId?: string;
  title?: string;
  token?: string;
  error?: boolean;
  errorCode?: string;
  message?: string;
  provider?: string;
}

const DATA_PREFIX = 'data:';
const DONE_EVENT = '[DONE]';
const PROVIDER_ERROR_PATTERNS = [
  'quota exceeded',
  'rate limit',
  'invalid api key',
  'no api key',
  'api key is missing',
  'api key is not set',
  'model "',
  'not available',
  'ai service is currently unavailable',
  'service error',
  'could not reach',
] as const;

function isProviderErrorToken(token: string): string | null {
  const lower = token.toLowerCase();
  if (lower.includes('quota') || lower.includes('rate limit')) {
    return 'QUOTA_EXCEEDED';
  }
  if (lower.includes('invalid api key')) return 'invalidApiKey';
  if (lower.includes('ai service is currently unavailable')) {
    return 'aiServiceUnavailable';
  }
  return (
    PROVIDER_ERROR_PATTERNS.find((pattern) => lower.includes(pattern)) ?? null
  );
}

/** Transport layer for the AI chat stream (POST /api/ai/chat/stream).
 * Owns HTTP concerns only — conversation state stays in MessageService.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatStreamService {
  private readonly aiConfig = inject(AiConfigService);
  private readonly apiKeyService = inject(ApiKeyService);

  /** Provider headers shared by the SSE stream and the audio mutation. */
  buildApiHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const activeProvider = this.aiConfig.provider();
    const providerKey = this.apiKeyService.getKeyHeader(activeProvider);
    if (providerKey) {
      headers[`x-${activeProvider}-api-key`] = providerKey;
      headers['x-provider-api-key'] = providerKey;
    }
    const groqKey = this.apiKeyService.getGroqKeyHeader();
    const geminiKey = this.apiKeyService.getGeminiKeyHeader();
    if (groqKey) headers['x-groq-api-key'] = groqKey;
    if (geminiKey) headers['x-gemini-api-key'] = geminiKey;
    return headers;
  }

  /** Streams the answer, invoking `onToken` for every received chunk. */
  async streamChat(
    request: StreamChatRequest,
    onToken: (token: string) => void,
  ): Promise<StreamChatResult> {
    const response = await fetch(API_URLS.chatStream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.buildApiHeaders(),
      },
      body: JSON.stringify({
        message: request.message,
        sessionId: request.sessionId || undefined,
        targetLanguage: request.targetLanguage,
        context: request.context || undefined,
        model: this.aiConfig.selectedModelId(),
        provider: this.aiConfig.provider(),
      }),
    });

    if (!response.ok || !response.body) {
      const raw = response.ok ? '' : await response.text().catch(() => '');
      throw new Error(
        formatApiError(
          raw || MESSAGE_TEMPLATES.streamRequestFailed(response.status),
        ),
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sessionId = request.sessionId;
    let text = '';
    let title: string | null = null;
    let error: StreamChatError | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line.startsWith(DATA_PREFIX)) {
          const payload = line.slice(DATA_PREFIX.length).trim();

          if (payload && payload !== DONE_EVENT) {
            const parsed = JSON.parse(payload) as StreamPayload;

            if (parsed.error) {
              error = {
                code: parsed.errorCode ?? '',
                message: parsed.message || MESSAGES.error.aiServiceError,
                provider: parsed.provider ?? null,
              };
            } else {
              if (parsed.sessionId) sessionId = parsed.sessionId;
              if (parsed.title) title = parsed.title;
              if (parsed.token) {
                const token = parsed.token;
                const tokenError = isProviderErrorToken(token);
                if (tokenError) {
                  error = {
                    code: tokenError,
                    message: token,
                    provider: null,
                  };
                } else {
                  text += token;
                  onToken(token);
                }
              }
            }
          }
        }

        newlineIndex = buffer.indexOf('\n');
      }
    }

    return { text, sessionId, title, error };
  }
}
