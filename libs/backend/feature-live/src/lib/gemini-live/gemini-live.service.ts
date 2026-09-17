import { Injectable, Logger } from '@nestjs/common';
import {
  GEMINI_API_KEY,
  GEMINI_CHAT_MODEL,
  GEMINI_TTS_MODEL,
  buildChatPayload,
  buildTtsPayload,
  resolveGeminiUrl,
  getVoiceForLanguage,
  extractResponseText,
  extractResponseAudio,
  ChatMessage,
} from './gemini-live.util';
import { QuotaExceededError } from '../groq-live/groq-live.service';
import { BACKEND_MESSAGES } from '../constants/messages';

/** Low-level Gemini REST helpers shared by all Gemini Live service methods. */
const postJson = async (url: string, payload: unknown): Promise<Response> =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

@Injectable()
export class GeminiLiveService {
  private readonly logger = new Logger(GeminiLiveService.name);
  private readonly apiUrlBase = process.env['apiUrlBase'];

  async getGeminiChatResponse(
    history: ChatMessage[],
    newMessage: string,
    audioData?: string,
    mimeType?: string,
    targetLanguage = 'English',
    modelOverride?: string,
    apiKeyOverride?: string,
  ): Promise<string> {
    const key = apiKeyOverride || GEMINI_API_KEY || '';
    if (!key) {
      this.logger.warn(BACKEND_MESSAGES.log.geminiKeyMissing);
      return BACKEND_MESSAGES.error.geminiApiKeyMissing;
    }

    const model = modelOverride || GEMINI_CHAT_MODEL;
    const apiUrl = resolveGeminiUrl(this.apiUrlBase, model, key);
    const payload = buildChatPayload(
      history,
      newMessage,
      audioData,
      mimeType,
      targetLanguage,
    );

    this.logger.log(
      BACKEND_MESSAGES.template.requestingChat(apiUrl.replace(key, '***')),
    );

    try {
      return await this.postWithRetry(apiUrl, payload, !!apiKeyOverride);
    } catch (error) {
      if (error instanceof QuotaExceededError) throw error;
      if (error instanceof Error) {
        this.logger.error(
          BACKEND_MESSAGES.template.geminiChatError(error.message),
        );
      } else {
        this.logger.error(
          BACKEND_MESSAGES.template.geminiChatError(String(error)),
        );
      }
      return BACKEND_MESSAGES.error.geminiConnectivity;
    }
  }

  async getGeminiTtsAudio(
    text: string,
    targetLanguage?: string,
    apiKeyOverride?: string,
  ): Promise<{ audioData: string; mimeType: string } | null> {
    const key = apiKeyOverride || GEMINI_API_KEY || '';
    if (!key) return null;
    const apiUrl = resolveGeminiUrl(this.apiUrlBase, GEMINI_TTS_MODEL, key);
    const voice = getVoiceForLanguage(targetLanguage || 'en');
    const payload = buildTtsPayload(text, voice);

    this.logger.log(BACKEND_MESSAGES.template.generatingTts(voice));

    try {
      const response = await postJson(apiUrl, payload);
      if (!response.ok) {
        this.logger.error(
          BACKEND_MESSAGES.template.ttsApiError(
            response.status,
            response.statusText,
          ),
        );
        return null;
      }

      const audio = extractResponseAudio(await response.json());
      if (audio) {
        this.logger.log(BACKEND_MESSAGES.log.geminiTtsGenerated);
      } else {
        this.logger.warn(BACKEND_MESSAGES.log.geminiTtsNoAudio);
      }
      return audio;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          BACKEND_MESSAGES.template.geminiTtsError(error.message),
        );
      } else {
        this.logger.error(
          BACKEND_MESSAGES.template.geminiTtsError(String(error)),
        );
      }
      return null;
    }
  }

  private async postWithRetry(
    url: string,
    payload: unknown,
    isUserKey = false,
  ): Promise<string> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      const response = await postJson(url, payload);

      if (response.ok) {
        const text = extractResponseText(await response.json());
        if (text) {
          this.logger.log(BACKEND_MESSAGES.log.geminiChatReceived);
          return text;
        }
        this.logger.warn(BACKEND_MESSAGES.log.geminiEmptyContent);
        return BACKEND_MESSAGES.error.geminiEmptyResponse;
      }

      // Quota exhausted on server key → signal frontend to ask user for their own key
      if ((response.status === 429 || response.status === 402) && !isUserKey) {
        throw new QuotaExceededError('gemini');
      }

      this.logger.error(
        `API Error (Attempt ${attempt + 1}): ${response.status} - ${
          response.statusText
        }`,
      );
      attempt++;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(BACKEND_MESSAGES.error.geminiRetriesExhausted);
  }
}
