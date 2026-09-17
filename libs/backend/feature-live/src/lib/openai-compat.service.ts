import { Injectable, Logger } from '@nestjs/common';
import { buildTutorSystemPrompt } from './tutor-prompt';
import { AI_PROVIDERS_REGISTRY } from './ai-providers.registry';

const MAX_HISTORY_LENGTH = 10;
const MAX_CONTENT_LENGTH = 1500;

export interface OpenAiCompatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class OpenAiCompatService {
  private readonly logger = new Logger(OpenAiCompatService.name);

  buildMessages(
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    targetLanguage: string,
  ): OpenAiCompatMessage[] {
    const trimmed = history.slice(-MAX_HISTORY_LENGTH).map((msg) => ({
      role: (msg.role === 'model' ? 'assistant' : 'user') as
        | 'assistant'
        | 'user',
      content: (msg.text || '').slice(0, MAX_CONTENT_LENGTH),
    }));

    return [
      { role: 'system', content: buildTutorSystemPrompt(targetLanguage) },
      ...trimmed,
      {
        role: 'user',
        content: (newMessage || '').slice(0, MAX_CONTENT_LENGTH),
      },
    ];
  }

  async getChatResponse(
    providerId: string,
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    targetLanguage = 'English',
    modelOverride?: string,
    customApiKey?: string,
  ): Promise<string> {
    const config = AI_PROVIDERS_REGISTRY[providerId];
    if (!config) {
      return `Provider "${providerId}" is not configured.`;
    }

    const apiKey = customApiKey || process.env[config.keyEnv] || '';
    if (!apiKey) {
      return `No API key configured for ${config.label}. Please add your key in Settings > AI Model.`;
    }

    const model = modelOverride || config.defaultModel;
    const messages = this.buildMessages(history, newMessage, targetLanguage);

    if (config.chatApi === 'anthropic') {
      return this.callAnthropic(apiKey, model, messages);
    }

    const chatUrl = config.chatUrl;
    if (!chatUrl) {
      return `Chat endpoint not available for ${config.label}.`;
    }

    try {
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        this.logger.error(
          `${config.label} error: ${res.status} - ${res.statusText} - ${errorText}`,
        );
        return `${config.label} error (${res.status}). Please verify your model or API key.`;
      }

      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return (
        body.choices?.[0]?.message?.content ||
        'No response received from model.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error in ${config.label}: ${msg}`);
      return `Could not reach ${config.label} service.`;
    }
  }

  async *generateStream(
    providerId: string,
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    targetLanguage = 'English',
    modelOverride?: string,
    customApiKey?: string,
  ): AsyncGenerator<string, void, unknown> {
    const config = AI_PROVIDERS_REGISTRY[providerId];
    if (!config) {
      yield `Provider "${providerId}" is not configured.`;
      return;
    }

    const apiKey = customApiKey || process.env[config.keyEnv] || '';
    if (!apiKey) {
      yield `No API key configured for ${config.label}. Please add your key in Settings > AI Model.`;
      return;
    }

    const model = modelOverride || config.defaultModel;
    const messages = this.buildMessages(history, newMessage, targetLanguage);

    if (config.chatApi === 'anthropic') {
      const full = await this.callAnthropic(apiKey, model, messages);
      yield full;
      return;
    }

    const chatUrl = config.chatUrl;
    if (!chatUrl) {
      yield `Chat endpoint not configured for ${config.label}.`;
      return;
    }

    try {
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1024,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        yield `${config.label} error (${res.status}). Please check your key.`;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr) as {
                choices?: { delta?: { content?: string } }[];
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {
              // ignore parse errors on SSE chunks
            }
          }
          newlineIndex = buffer.indexOf('\n');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Stream error in ${config.label}: ${msg}`);
      yield `Could not reach ${config.label} service.`;
    }
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    messages: OpenAiCompatMessage[],
  ): Promise<string> {
    try {
      const systemMessage = messages.find((m) => m.role === 'system');
      const nonSystemMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemMessage?.content,
          messages: nonSystemMessages,
        }),
      });

      if (!res.ok) {
        return `Anthropic error (${res.status}). Check your API key.`;
      }

      const body = (await res.json()) as {
        content?: { type: string; text: string }[];
      };
      return (
        body.content?.find((c) => c.type === 'text')?.text ||
        'No response from Anthropic.'
      );
    } catch {
      return 'Could not reach Anthropic service.';
    }
  }
}
