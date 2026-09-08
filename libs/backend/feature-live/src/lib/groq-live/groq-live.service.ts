import { Injectable, Logger } from '@nestjs/common';
import { buildTutorSystemPrompt } from '../tutor-prompt';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_HISTORY_LENGTH = 10;
const MAX_CONTENT_LENGTH = 1500;

export interface GroqHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Port du AiChatService du portfolio (Groq, API compatible OpenAI)
 * adapté au tuteur de langues. Utilise fetch natif (aucun SDK),
 * avec fallback de modèle et streaming SSE.
 */
@Injectable()
export class GroqLiveService {
  private readonly logger = new Logger(GroqLiveService.name);
  private readonly apiKey = process.env['GROQ_API_KEY'] || '';
  private readonly model = process.env['AI_MODEL'] || 'llama-3.3-70b-versatile';
  private readonly fallbackModel =
    process.env['AI_FALLBACK_MODEL'] || 'llama-3.1-8b-instant';

  private buildMessages(
    history: GroqHistoryMessage[],
    newMessage: string,
    targetLanguage: string
  ): { role: 'system' | 'user' | 'assistant'; content: string }[] {
    const trimmedHistory = history.slice(-MAX_HISTORY_LENGTH).map((msg) => ({
      role: (msg.role === 'model' ? 'assistant' : 'user') as
        | 'assistant'
        | 'user',
      content: (msg.text || '').slice(0, MAX_CONTENT_LENGTH),
    }));

    return [
      { role: 'system', content: buildTutorSystemPrompt(targetLanguage) },
      ...trimmedHistory,
      {
        role: 'user',
        content: (newMessage || '').slice(0, MAX_CONTENT_LENGTH),
      },
    ];
  }

  private async createCompletion(
    messages: { role: string; content: string }[],
    options: { stream?: boolean; useFallback?: boolean; modelOverride?: string; apiKey?: string } = {}
  ): Promise<Response> {
    const model = options.modelOverride || (options.useFallback ? this.fallbackModel : this.model);
    const apiKey = options.apiKey || this.apiKey;
    return fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        stream: options.stream ?? false,
      }),
    });
  }

  async getGroqChatResponse(
    history: GroqHistoryMessage[],
    newMessage: string,
    targetLanguage = 'English',
    modelOverride?: string,
    customApiKey?: string
  ): Promise<string> {
    const apiKey = customApiKey || this.apiKey;
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY is not set.');
      return 'Error: No API key configured. Add your Groq API key in Settings > AI Model, or contact the admin.';
    }

    const messages = this.buildMessages(history, newMessage, targetLanguage);

    try {
      const response = await this.createCompletion(messages, { modelOverride, apiKey });

      if (!response.ok) {
        this.logger.error(
          `Groq API error with ${modelOverride || this.model}: ${response.status} - ${response.statusText}`
        );
        const fallback = await this.createCompletion(messages, {
          useFallback: true,
          apiKey,
        });
        if (!fallback.ok) {
          throw new Error(
            `Groq API error with fallback ${this.fallbackModel}: ${fallback.status}`
          );
        }
        return this.extractText(await fallback.json());
      }

      return this.extractText(await response.json());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in getGroqChatResponse: ${message}`);
      return 'Error: Could not reach Groq API. Check your internet connection or try a different model in Settings.';
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
    customApiKey?: string
  ): AsyncGenerator<string, void, unknown> {
    const apiKey = customApiKey || this.apiKey;
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY is not set.');
      yield 'Error: No API key configured. Add your Groq API key in Settings > AI Model, or contact the admin.';
      return;
    }

    const messages = this.buildMessages(history, newMessage, targetLanguage);

    let response = await this.createCompletion(messages, { stream: true, modelOverride, apiKey });
    if (!response.ok || !response.body) {
      this.logger.error(
        `Groq API error with ${modelOverride || this.model}: ${response.status} - ${response.statusText}`
      );
      response = await this.createCompletion(messages, {
        stream: true,
        useFallback: true,
        apiKey,
      });
    }

    if (!response.ok || !response.body) {
      throw new Error(
        `Groq API error: ${response.status} - ${response.statusText}`
      );
    }

    const reader = response.body.getReader();
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
