import { Injectable, Logger } from '@nestjs/common';
import type { OpenAiCompatMessage } from './openai-message.model';
import {
  buildOpenAiMessages,
  resolveOpenAiTarget,
} from './openai-request.util';
import {
  extractChatContent,
  extractStreamContent,
  splitAnthropicMessages,
} from './openai-response.util';
import { BACKEND_MESSAGES } from '../shared/messages';

@Injectable()
export class OpenAiCompatService {
  private readonly logger = new Logger(OpenAiCompatService.name);

  buildMessages(
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    targetLanguage: string,
  ): OpenAiCompatMessage[] {
    return buildOpenAiMessages(history, newMessage, targetLanguage);
  }

  async getChatResponse(
    providerId: string,
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    targetLanguage = 'English',
    modelOverride?: string,
    customApiKey?: string,
  ): Promise<string> {
    const target = resolveOpenAiTarget(providerId, modelOverride, customApiKey);
    if ('error' in target) return target.error;
    const { label, model, apiKey, chatUrl, chatApi } = target;
    const messages = this.buildMessages(history, newMessage, targetLanguage);
    if (chatApi === 'anthropic') return this.callAnthropic(apiKey, model, messages);
    if (!chatUrl) return `Chat endpoint not available for ${label}.`;
    try {
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, max_tokens: 1024 }),
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        this.logger.error(`${label} error: ${res.status} - ${res.statusText} - ${errorText}`);
        return `${label} error (${res.status}). Please verify your model or API key.`;
      }
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return extractChatContent(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(BACKEND_MESSAGES.template.providerError(label, msg));
      return BACKEND_MESSAGES.template.providerUnreachable(label);
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
    const target = resolveOpenAiTarget(providerId, modelOverride, customApiKey);
    if ('error' in target) {
      yield target.error;
      return;
    }
    const { label, model, apiKey, chatUrl, chatApi } = target;
    const messages = this.buildMessages(history, newMessage, targetLanguage);
    if (chatApi === 'anthropic') {
      yield await this.callAnthropic(apiKey, model, messages);
      return;
    }
    if (!chatUrl) {
      yield `Chat endpoint not configured for ${label}.`;
      return;
    }
    try {
      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, max_tokens: 1024, stream: true }),
      });
      if (!res.ok || !res.body) {
        yield `${label} error (${res.status}). Please check your key.`;
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
          const content = extractStreamContent(buffer.slice(0, newlineIndex));
          buffer = buffer.slice(newlineIndex + 1);
          if (content) yield content;
          newlineIndex = buffer.indexOf('\n');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(BACKEND_MESSAGES.template.providerStreamError(label, msg));
      yield BACKEND_MESSAGES.template.providerUnreachable(label);
    }
  }

  private async callAnthropic(
    apiKey: string,
    model: string,
    messages: OpenAiCompatMessage[],
  ): Promise<string> {
    try {
      const { system, messages: nonSystem } = splitAnthropicMessages(messages);
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
          system,
          messages: nonSystem,
        }),
      });
      if (!res.ok) return `Anthropic error (${res.status}). Check your API key.`;
      const body = (await res.json()) as {
        content?: { type: string; text: string }[];
      };
      return (
        body.content?.find((c) => c.type === 'text')?.text || 'No response from Anthropic.'
      );
    } catch {
      return 'Could not reach Anthropic service.';
    }
  }
}
