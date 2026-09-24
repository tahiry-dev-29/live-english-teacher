import { buildTutorSystemPrompt } from '../../tutor/tutor-prompt';
import { GROQ_CONFIG } from '@shared/constants';

export interface GroqHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MAX_HISTORY = GROQ_CONFIG.maxHistoryLength;
const MAX_CONTENT = GROQ_CONFIG.maxContentLength;

/** System prompt + trimmed history + new message (pure). */
export function buildGroqMessages(
  history: GroqHistoryMessage[],
  newMessage: string,
  targetLanguage: string,
): GroqChatMessage[] {
  const trimmed = history.slice(-MAX_HISTORY).map((msg) => ({
    role: (msg.role === 'model' ? 'assistant' : 'user') as
      | 'assistant'
      | 'user',
    content: (msg.text || '').slice(0, MAX_CONTENT),
  }));
  return [
    { role: 'system', content: buildTutorSystemPrompt(targetLanguage) },
    ...trimmed,
    { role: 'user', content: (newMessage || '').slice(0, MAX_CONTENT) },
  ];
}

/** Raw OpenAI-compatible completion POST (pure transport). */
export function createGroqCompletion(
  messages: GroqChatMessage[],
  options: { apiKey: string; model: string; stream?: boolean },
): Promise<Response> {
  return fetch(GROQ_CONFIG.apiBaseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      max_tokens: 1024,
      stream: options.stream ?? false,
    }),
  });
}
