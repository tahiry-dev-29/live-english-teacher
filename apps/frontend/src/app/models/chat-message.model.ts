export type ChatRole = 'user' | 'ai';

export type ChatMessageKind = 'normal' | 'error';

/** Chat bubble rendered in the conversation view. */
export interface ChatMessage {
  role: ChatRole;
  text: string;
  audioData?: string;
  mimeType?: string;
  /** `error` renders the bubble with error styling — never inferred from text. */
  kind?: ChatMessageKind;
}

/** Maps a persisted session role (`user` | `model`) to a chat role. */
export function toChatRole(role: string): ChatRole {
  return role === 'user' ? 'user' : 'ai';
}
