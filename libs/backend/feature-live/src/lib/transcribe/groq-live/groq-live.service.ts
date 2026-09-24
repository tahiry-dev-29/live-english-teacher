import { Injectable, Logger } from '@nestjs/common';
import { BACKEND_MESSAGES } from '../../shared/messages';
import { GROQ_CONFIG } from '@shared/constants';
import {
  buildGroqMessages,
  createGroqCompletion,
  type GroqHistoryMessage,
} from './groq-request.util';

export type { GroqHistoryMessage };

/** Thrown when the server API key quota is exhausted (HTTP 429 / 402). */
export class QuotaExceededError extends Error {
  readonly provider: 'groq' | 'gemini';
  constructor(provider: 'groq' | 'gemini') {
    super(`${provider} quota exceeded`);
    this.provider = provider;
    this.name = 'QuotaExceededError';
  }
}

/**
 * Port du AiChatService du portfolio (Groq, API compatible OpenAI)
 * adapté au tuteur de langues. Utilise fetch natif (aucun SDK),
 * avec fallback de modèle et streaming SSE.
 */
@Injectable()
export class GroqLiveService {
  private readonly logger = new Logger(GroqLiveService.name);
  private readonly apiKey = process.env[GROQ_CONFIG.apiKeyEnv] || '';
  private readonly model =
    process.env[GROQ_CONFIG.modelEnv] || GROQ_CONFIG.defaultModel;
  private readonly fallbackModel =
    process.env[GROQ_CONFIG.fallbackModelEnv] || GROQ_CONFIG.fallbackModel;

  private modelFor(useFallback?: boolean, override?: string): string {
    return override || (useFallback ? this.fallbackModel : this.model);
  }

  async getGroqChatResponse(
    history: GroqHistoryMessage[],
    newMessage: string,
    targetLanguage = 'English',
    modelOverride?: string,
    customApiKey?: string,
  ): Promise<string> {
    const apiKey = customApiKey || this.apiKey;
    if (!apiKey) {
      this.logger.warn(BACKEND_MESSAGES.log.groqKeyMissing);
      return BACKEND_MESSAGES.error.groqApiKeyMissing;
    }
    const messages = buildGroqMessages(history, newMessage, targetLanguage);

    try {
      const response = await createGroqCompletion(messages, {
        apiKey,
        model: this.modelFor(false, modelOverride),
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        this.logger.error(
          `Groq API error with ${modelOverride || this.model}: ${response.status} - ${response.statusText} - ${errorText}`,
        );
        if (
          (response.status === 429 || response.status === 402) &&
          !customApiKey
        ) {
          throw new QuotaExceededError('groq');
        }
        if (response.status === 404) {
          return `Model "${modelOverride || this.model}" is not available. Please try a different model in Settings > AI Model, or add your own API key.`;
        }
        if (response.status === 401 || response.status === 403) {
          return 'Invalid API key. Please check your Groq API key in Settings > AI Model, or add your own API key.';
        }
        const fallback = await createGroqCompletion(messages, {
          apiKey,
          model: this.modelFor(true),
        });
        if (!fallback.ok) {
          return `AI service error (${response.status}). Please try again later or add your own API key in Settings.`;
        }
        return this.extractText(await fallback.json());
      }
      return this.extractText(await response.json());
    } catch (error) {
      if (error instanceof QuotaExceededError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(BACKEND_MESSAGES.template.groqChatError(message));
      return BACKEND_MESSAGES.error.aiUnreachable;
    }
  }

  private extractText(completion: {
    choices?: { message?: { content?: string } }[];
  }): string {
    return (
      completion.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response right now. Could you try asking something else?"
    );
  }

  /**
   * Streaming token par token (SSE côté Groq), consommé par
   * AiStreamController. Fallback de modèle en cas d'échec du modèle primaire.
   */
  async *generateStream(
    history: GroqHistoryMessage[],
    newMessage: string,
    targetLanguage = 'English',
    modelOverride?: string,
    customApiKey?: string,
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = customApiKey || this.apiKey;
    if (!apiKey) {
      this.logger.warn(BACKEND_MESSAGES.log.groqKeyMissing);
      yield BACKEND_MESSAGES.error.groqApiKeyMissing;
      return;
    }
    const messages = buildGroqMessages(history, newMessage, targetLanguage);
    let response = await createGroqCompletion(messages, {
      apiKey,
      model: this.modelFor(false, modelOverride),
      stream: true,
    });
    if (!response.ok || !response.body) {
      this.logger.error(
        `Groq API error with ${modelOverride || this.model}: ${response.status} - ${response.statusText}`,
      );
      if (
        (response.status === 429 || response.status === 402) &&
        !customApiKey
      ) {
        throw new QuotaExceededError('groq');
      }
      if (response.status === 404) {
        yield `Model "${modelOverride || this.model}" is not available. Please try a different model in Settings > AI Model, or add your own API key.`;
        return;
      }
      if (response.status === 401 || response.status === 403) {
        yield 'Invalid API key. Please check your Groq API key in Settings > AI Model, or add your own API key.';
        return;
      }
      response = await createGroqCompletion(messages, {
        apiKey,
        model: this.modelFor(true),
        stream: true,
      });
    }
    if (!response.ok || !response.body) {
      yield 'AI service error. Please try again later or add your own API key in Settings.';
      return;
    }
    yield* this.streamDeltas(response);
  }

  private async *streamDeltas(response: Response): AsyncGenerator<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const chunk = JSON.parse(payload);
          const token: string = chunk.choices?.[0]?.delta?.content || '';
          if (token) yield token;
        } catch {
          this.logger.warn(`Skipping malformed SSE chunk: ${payload}`);
        }
      }
    }
  }
}
