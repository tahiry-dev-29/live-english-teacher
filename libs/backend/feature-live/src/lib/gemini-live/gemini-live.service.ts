import { Injectable, Logger } from '@nestjs/common';
import { buildTutorSystemPrompt } from '../tutor-prompt';

const GEMINI_API_KEY = process.env['GEMINI_API_KEY'];
const GEMINI_CHAT_MODEL = 'gemini-2.5-flash';
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

@Injectable()
export class GeminiLiveService {
  private readonly logger = new Logger(GeminiLiveService.name);
  private readonly apiUrlBase = process.env['apiUrlBase'];

  private buildPayload(
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    audioData?: string,
    mimeType?: string,
    targetLanguage = 'English'
  ) {
    const contents = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    const userParts: any[] = [];
    if (newMessage) {
      userParts.push({ text: newMessage });
    }
    if (audioData && mimeType) {
      userParts.push({
        inlineData: {
          mimeType: mimeType,
          data: audioData,
        },
      });
    }

    if (userParts.length > 0) {
      contents.push({
        role: 'user',
        parts: userParts,
      });
    }

    const systemInstruction = {
      parts: [
        {
          text: buildTutorSystemPrompt(targetLanguage),
        },
      ],
    };

    return {
      contents,
      systemInstruction,
    };
  }

  async getGeminiChatResponse(
    history: { role: 'user' | 'model'; text: string }[],
    newMessage: string,
    audioData?: string,
    mimeType?: string,
    targetLanguage = 'English'
  ): Promise<string> {
    const baseUrl =
      this.apiUrlBase ||
      'https://generativelanguage.googleapis.com/v1beta/models/';
    const apiUrl = `${baseUrl}${GEMINI_CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    this.logger.log(`Using Base URL: ${baseUrl}`);
    this.logger.log(
      `Requesting Chat from: ${apiUrl.replace(GEMINI_API_KEY || '', '***')}`
    );
    const payload = this.buildPayload(
      history,
      newMessage,
      audioData,
      mimeType,
      targetLanguage
    );

    try {
      this.logger.log(`Sending chat request to ${GEMINI_CHAT_MODEL}`);
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

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

      throw new Error(
        'Failed to get response from Gemini after multiple retries.'
      );
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
    const baseUrl =
      this.apiUrlBase ||
      'https://generativelanguage.googleapis.com/v1beta/models/';
    const apiUrl = `${baseUrl}${GEMINI_TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const voice = this.getVoiceForLanguage(targetLanguage || 'en');

    const payload = {
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

    this.logger.log(`Generating TTS audio with voice: ${voice}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.error(
          `TTS API Error: ${response.status} - ${response.statusText}`
        );
        return null;
      }

      const result = await response.json();
      const part = result.candidates?.[0]?.content?.parts?.[0];

      if (part?.inlineData) {
        this.logger.log('TTS audio generated successfully.');
        return {
          audioData: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'audio/wav',
        };
      }

      this.logger.warn('No audio data in TTS response.');
      return null;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error in getGeminiTtsAudio: ${error.message}`);
      } else {
        this.logger.error(`Error in getGeminiTtsAudio: ${String(error)}`);
      }
      return null;
    }
  }

  private getVoiceForLanguage(language: string): string {
    const lang = language.toLowerCase();
    if (lang.startsWith('fr')) return 'Puck';
    if (lang.startsWith('es')) return 'Fenrir';
    return 'Kore';
  }
}
