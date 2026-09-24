import type { OpenAiChatChoice, OpenAiStreamChoice } from './openai-message.model';
import { BACKEND_MESSAGES } from '../shared/messages';

/** Extracts the assistant text from a chat-completion payload. */
export function extractChatContent(body: { choices?: OpenAiChatChoice[] }): string {
  return (
    body.choices?.[0]?.message?.content || BACKEND_MESSAGES.error.noResponseReceived
  );
}

/** Extracts the delta text from one SSE data line ('' when not a token). */
export function extractStreamContent(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return '';
  const dataStr = trimmed.slice(5).trim();
  if (!dataStr || dataStr === '[DONE]') return '';
  try {
    const parsed = JSON.parse(dataStr) as { choices?: OpenAiStreamChoice[] };
    return parsed.choices?.[0]?.delta?.content || '';
  } catch {
    return '';
  }
}

/** Splits Anthropic messages into system prompt + message list. */
export function splitAnthropicMessages<T extends { role: string; content: string }>(
  messages: T[],
): { system?: string; messages: { role: string; content: string }[] } {
  const system = messages.find((m) => m.role === 'system')?.content;
  return {
    system,
    messages: messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content })),
  };
}
