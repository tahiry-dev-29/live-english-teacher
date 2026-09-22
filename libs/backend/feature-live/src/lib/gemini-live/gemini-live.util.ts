import { buildTutorSystemPrompt } from '../tutor-prompt';
import { GEMINI_CONFIG } from '@shared/constants';

export const GEMINI_API_KEY = process.env[GEMINI_CONFIG.apiKeyEnv];
export const GEMINI_CHAT_MODEL = GEMINI_CONFIG.defaultChatModel;
export const GEMINI_TTS_MODEL = GEMINI_CONFIG.defaultTtsModel;

/** @deprecated Use GEMINI_CONFIG.apiBaseUrl — kept for backward compatibility */
export const GEMINI_API_BASE_URL = GEMINI_CONFIG.apiBaseUrl;

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiContent {
  role: ChatRole;
  parts: GeminiPart[];
}

export interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig?: Record<string, unknown>;
}

export interface GeminiApiResponse {
  candidates?: {
    content?: GeminiContent;
  }[];
}

export function resolveGeminiUrl(
  baseUrl: string | undefined,
  model: string,
  apiKey: string,
): string {
  return GEMINI_CONFIG.buildGenerateUrl(model, apiKey, baseUrl);
}

export function resolveGeminiStreamUrl(
  baseUrl: string | undefined,
  model: string,
  apiKey: string,
): string {
  return GEMINI_CONFIG.buildStreamUrl(model, apiKey, baseUrl);
}

/**
 * Extracts the text delta from one SSE `data:` line of
 * `streamGenerateContent` (each line is a full JSON response chunk).
 * Returns '' when the line carries no text (keep-alive, finish marker…).
 */
export function parseGeminiSseLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return '';
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return '';
  try {
    const chunk = JSON.parse(payload) as GeminiApiResponse;
    return extractResponseText(chunk) ?? '';
  } catch {
    return '';
  }
}

/** Low-level Gemini REST POST shared by chat, stream and TTS. */
export const postJson = async (
  url: string,
  payload: unknown,
): Promise<Response> =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

/**
 * Yields text deltas from an open `streamGenerateContent` SSE body,
 * handling chunk splits across network frames.
 */
export async function* streamResponseDeltas(
  response: Response,
): AsyncGenerator<string, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const token = parseGeminiSseLine(line);
      if (token) yield token;
    }
  }
  const tail = parseGeminiSseLine(buffer);
  if (tail) yield tail;
}

export function buildChatPayload(
  history: ChatMessage[],
  newMessage: string,
  audioData?: string,
  mimeType?: string,
  targetLanguage = 'English',
): GeminiGenerateContentRequest {
  const contents: GeminiContent[] = history.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const userParts: GeminiPart[] = [];
  if (newMessage) {
    userParts.push({ text: newMessage });
  }
  if (audioData && mimeType) {
    userParts.push({ inlineData: { mimeType, data: audioData } });
  }
  if (userParts.length > 0) {
    contents.push({ role: 'user', parts: userParts });
  }

  return {
    contents,
    systemInstruction: {
      parts: [{ text: buildTutorSystemPrompt(targetLanguage) }],
    },
  };
}

export function buildTtsPayload(
  text: string,
  voice: string,
): GeminiGenerateContentRequest {
  return {
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['audio'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  };
}

export function getVoiceForLanguage(language: string): string {
  const lang = language.toLowerCase();
  if (lang.startsWith('fr')) return 'Puck';
  if (lang.startsWith('es')) return 'Fenrir';
  return 'Kore';
}

export function extractResponseText(
  result: GeminiApiResponse,
): string | undefined {
  const cand = result.candidates?.[0];
  const content = cand?.content;
  if (!content) return undefined;
  const part = content.parts?.[0];
  return part?.text;
}

export function extractResponseAudio(
  result: GeminiApiResponse,
): { audioData: string; mimeType: string } | null {
  const cand = result.candidates?.[0];
  const content = cand?.content;
  if (!content) return null;
  const part = content.parts?.[0];
  if (part?.inlineData?.data) {
    return {
      audioData: part.inlineData.data,
      mimeType: part.inlineData.mimeType || 'audio/wav',
    };
  }
  return null;
}
