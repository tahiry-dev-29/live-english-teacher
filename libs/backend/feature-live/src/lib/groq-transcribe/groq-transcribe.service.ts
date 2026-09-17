import { Injectable, Logger } from '@nestjs/common';
import { BACKEND_MESSAGES } from '../constants/messages';

@Injectable()
export class GroqTranscribeService {
  private readonly logger = new Logger(GroqTranscribeService.name);
  private readonly apiKey = process.env['GROQ_API_KEY'] || '';
  private readonly model = 'whisper-large-v3-turbo';

  async transcribe(
    audioData: string,
    mimeType = 'audio/webm',
    language?: string,
    modelOverride?: string,
    customApiKey?: string,
  ): Promise<string | null> {
    const key = customApiKey || this.apiKey;
    if (!key) {
      this.logger.warn(BACKEND_MESSAGES.log.groqTranscribeKeyMissing);
      return null;
    }

    const selectedModel = modelOverride || this.model;

    try {
      const audioBuffer = Buffer.from(audioData, 'base64');
      const ext = mimeType.includes('wav')
        ? 'wav'
        : mimeType.includes('mp4') || mimeType.includes('m4a')
          ? 'm4a'
          : mimeType.includes('mp3') || mimeType.includes('mpeg')
            ? 'mp3'
            : 'webm';

      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      formData.append('file', blob, `audio.${ext}`);
      formData.append('model', selectedModel);
      formData.append('temperature', '0');
      if (language) {
        formData.append('language', language);
      }

      const response = await fetch(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(
          `Groq Whisper Error: ${response.status} - ${response.statusText}: ${errText}`,
        );
        return null;
      }

      const data = (await response.json()) as { text?: string };
      return data.text || null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(BACKEND_MESSAGES.template.groqTranscribeFailed(msg));
      return null;
    }
  }
}
