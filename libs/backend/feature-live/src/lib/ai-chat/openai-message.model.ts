/** Single OpenAI-compatible chat message. */
export interface OpenAiCompatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Raw OpenAI chat-completion choice payload. */
export interface OpenAiChatChoice {
  message?: { content?: string };
}

/** Raw OpenAI SSE stream delta payload. */
export interface OpenAiStreamChoice {
  delta?: { content?: string };
}
