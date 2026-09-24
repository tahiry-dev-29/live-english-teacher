import { Injectable, Logger } from '@nestjs/common';
import {
  GEMINI_API_KEY,
  GEMINI_CHAT_MODEL,
  GEMINI_TTS_MODEL,
  buildChatPayload,
  buildTtsPayload,
  resolveGeminiUrl,
  resolveGeminiStreamUrl,
  postJson,
  streamResponseDeltas,
  getVoiceForLanguage,
  extractResponseAudio,
  ChatMessage,
} from './gemini-live.util';
import { postGeminiWithRetry } from './gemini-request.util';
import { QuotaExceededError } from '../groq-live/groq-live.service';
import { BACKEND_MESSAGES } from '../../shared/messages';
import { GEMINI_CONFIG } from '@shared/constants';

@Injectable()
export class GeminiLiveService {
  private readonly logger = new Logger(GeminiLiveService.name);
  private readonly apiUrlBase = process.env[GEMINI_CONFIG.customBaseUrlEnv];

  private keyFor(override?: string): string {
    return override || GEMINI_API_KEY || '';
  }

  async getGeminiChatResponse(
    history: ChatMessage[],
    newMessage: string,
    audioData?: string,
    mimeType?: string,
    targetLanguage = 'English',
    modelOverride?: string,
    apiKeyOverride?: string,
  ): Promise<string> {
    const key = this.keyFor(apiKeyOverride);
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
      return await postGeminiWithRetry(apiUrl, payload, {
        isUserKey: !!apiKeyOverride,
        logger: this.logger,
      });
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

  /** True token streaming via `streamGenerateContent` (SSE). 429/402 on the
   * server key throws QuotaExceededError, like the Groq path. */
  async *generateStream(
    history: ChatMessage[],
    newMessage: string,
    targetLanguage = 'English',
    modelOverride?: string,
    apiKeyOverride?: string,
  ): AsyncGenerator<string, void, unknown> {
    const key = this.keyFor(apiKeyOverride);
    if (!key) {
      this.logger.warn(BACKEND_MESSAGES.log.geminiKeyMissing);
      yield BACKEND_MESSAGES.error.geminiApiKeyMissing;
      return;
    }
    const url = resolveGeminiStreamUrl(
      this.apiUrlBase,
      modelOverride || GEMINI_CHAT_MODEL,
      key,
    );
    const payload = buildChatPayload(
      history,
      newMessage,
      undefined,
      undefined,
      targetLanguage,
    );
    let response: Response;
    try {
      response = await postJson(url, payload);
    } catch (error) {
      this.logger.error(
        BACKEND_MESSAGES.template.geminiChatError(
          error instanceof Error ? error.message : String(error),
        ),
      );
      yield BACKEND_MESSAGES.error.geminiConnectivity;
      return;
    }
    if (!response.ok || !response.body) {
      if (
        (response.status === 429 || response.status === 402) &&
        !apiKeyOverride
      ) {
        throw new QuotaExceededError('gemini');
      }
      this.logger.error(`Gemini stream error: ${response.status}`);
      yield BACKEND_MESSAGES.error.geminiConnectivity;
      return;
    }
    yield* streamResponseDeltas(response);
  }

  async getGeminiTtsAudio(
    text: string,
    targetLanguage?: string,
    apiKeyOverride?: string,
  ): Promise<{ audioData: string; mimeType: string } | null> {
    const key = this.keyFor(apiKeyOverride);
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
      this.logger.error(
        BACKEND_MESSAGES.template.geminiTtsError(
          error instanceof Error ? error.message : String(error),
        ),
      );
      return null;
    }
  }
}
