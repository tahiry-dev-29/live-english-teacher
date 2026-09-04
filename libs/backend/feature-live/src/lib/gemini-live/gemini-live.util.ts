import { buildTutorSystemPrompt } from '../tutor-prompt';

export const GEMINI_API_KEY = process.env['GEMINI_API_KEY'];
export const GEMINI_CHAT_MODEL = 'gemini-2.5-flash';
export const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export const GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/';

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
  apiKey: string
): string {
  return `${
    baseUrl || GEMINI_API_BASE_URL
  }${model}:generateContent?key=${apiKey}`;
}

export function buildChatPayload(
  history: ChatMessage[],
  newMessage: string,
  audioData?: string,
  mimeType?: string,
  targetLanguage = 'English'
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
  voice: string
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
  result: GeminiApiResponse
): string | undefined {
  const cand = result.candidates?.[0];
  const content = cand?.content;
  if (!content) return undefined;
  const part = content.parts?.[0];
  return part?.text;
}

export function extractResponseAudio(
  result: GeminiApiResponse
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
