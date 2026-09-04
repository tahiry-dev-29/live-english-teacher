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

/** Low-level Gemini REST helpers shared by all Gemini Live service methods. */
const postJson = async (
  url: string,
  payload: unknown
): Promise<Response> =>
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
    targetLanguage = 'English'
  ): Promise<string> {
    const apiUrl = resolveGeminiUrl(
      this.apiUrlBase,
      GEMINI_CHAT_MODEL,
      GEMINI_API_KEY
    );
    const payload = buildChatPayload(
      history,
      newMessage,
      audioData,
      mimeType,
      targetLanguage
    );

    this.logger.log(
      `Requesting Chat from: ${apiUrl.replace(GEMINI_API_KEY, '***')}`
    );

    try {
      return await this.postWithRetry(apiUrl, payload);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error in getGeminiChatResponse: ${error.message}`);
      } else {
        this.logger.error(`Error in getGeminiChatResponse: ${String(error)}`);
      }
      return "I'm experiencing connectivity issues. Please try again later.";
    }
  }

  async getGeminiTtsAudio(
    text: string,
    targetLanguage?: string
  ): Promise<{ audioData: string; mimeType: string } | null> {
    const apiUrl = resolveGeminiUrl(
      this.apiUrlBase,
      GEMINI_TTS_MODEL,
      GEMINI_API_KEY
    );
    const voice = getVoiceForLanguage(targetLanguage || 'en');
    const payload = buildTtsPayload(text, voice);

    this.logger.log(`Generating TTS audio with voice: ${voice}`);

    try {
      const response = await postJson(apiUrl, payload);
      if (!response.ok) {
        this.logger.error(
          `TTS API Error: ${response.status} - ${response.statusText}`
        );
        return null;
      }

      const audio = extractResponseAudio(await response.json());
      if (audio) {
        this.logger.log('TTS audio generated successfully.');
      } else {
        this.logger.warn('No audio data in TTS response.');
      }
      return audio;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error in getGeminiTtsAudio: ${error.message}`);
      } else {
        this.logger.error(`Error in getGeminiTtsAudio: ${String(error)}`);
      }
      return null;
    }
  }

  private async postWithRetry(url: string, payload: unknown): Promise<string> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      const response = await postJson(url, payload);

      if (response.ok) {
        const text = extractResponseText(await response.json());
        if (text) {
          this.logger.log('Gemini chat response received.');
          return text;
        }
        this.logger.warn('Gemini response was okay but content was empty.');
        return "I'm sorry, I couldn't generate a response right now. Could you try asking something else?";
      }

      this.logger.error(
        `API Error (Attempt ${attempt + 1}): ${response.status} - ${
          response.statusText
        }`
      );
      attempt++;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to get response from Gemini after multiple retries.');
  }
}
