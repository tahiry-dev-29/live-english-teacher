/**
 * Pure message-list transforms (Task 92 / plan-001): no Angular, no I/O.
 * The service owns signals + I/O; this file owns list math + cursor math.
 */
import { ChatMessage, toChatRole } from '@models/chat-message.model';
import type { StreamingCursor } from './message.service';

interface PersistedMessage {
  role: string;
  content: string;
}

/** Maps GraphQL session messages to chat bubbles. */
export function mapSessionMessages(items: PersistedMessage[]): ChatMessage[] {
  return items.map((msg): ChatMessage => ({
    role: toChatRole(msg.role),
    text: msg.content,
  }));
}

/** Appends one streaming token; creates the AI placeholder on first token. */
export function pushStreamingToken(
  msgs: ChatMessage[],
  cursor: StreamingCursor,
  token: string,
): { msgs: ChatMessage[]; cursor: StreamingCursor; streaming: boolean } {
  const text = cursor.text + token;
  if (cursor.index !== null) {
    return {
      msgs: msgs.map((msg, i) => (i === cursor.index ? { ...msg, text } : msg)),
      cursor: { index: cursor.index, text },
      streaming: true,
    };
  }
  return {
    msgs: [...msgs, { role: 'ai', text }],
    cursor: { index: msgs.length, text },
    streaming: true,
  };
}

/** Removes the streaming placeholder (stream failed before completion). */
export function removeStreamingPlaceholder(
  msgs: ChatMessage[],
  cursor: StreamingCursor,
): { msgs: ChatMessage[]; cursor: StreamingCursor } {
  if (cursor.index === null) return { msgs, cursor };
  const index = cursor.index;
  return {
    msgs: index < msgs.length ? msgs.filter((_, i) => i !== index) : msgs,
    cursor: { index: null, text: '' },
  };
}

/** Appends an error bubble (kind 'error' — never inferred from text). */
export function appendErrorMessage(
  msgs: ChatMessage[],
  text: string,
): ChatMessage[] {
  return [...msgs, { role: 'ai', text, kind: 'error' }];
}
