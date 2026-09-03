import { Injectable } from '@nestjs/common';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import {
  GroqLiveService,
  GroqHistoryMessage,
} from './groq-live/groq-live.service';

export type AiHistoryMessage = GroqHistoryMessage;

/**
 * Point d'entrée unique des providers IA. Sélectionne gemini|groq selon
 * AI_PROVIDER. L'audio (input audio / TTS) reste toujours géré par Gemini :
 * les modèles texte Groq ne gèrent pas l'audio inline.
 */
@Injectable()
export class AiProviderService {
  constructor(
    private readonly geminiLiveService: GeminiLiveService,
    private readonly groqLiveService: GroqLiveService
  ) {}

  get provider(): 'gemini' | 'groq' {
    return (process.env['AI_PROVIDER'] as 'gemini' | 'groq') || 'gemini';
  }

  generateText(
    history: AiHistoryMessage[],
    content: string,
    options: {
      audioData?: string;
      mimeType?: string;
      targetLanguage?: string;
    } = {}
  ): Promise<string> {
    if (this.provider === 'groq' && !options.audioData) {
      return this.groqLiveService.getGroqChatResponse(
        history,
        content,
        options.targetLanguage || 'English'
      );
    }
    return this.geminiLiveService.getGeminiChatResponse(
      history,
      content,
      options.audioData,
      options.mimeType,
      options.targetLanguage
    );
  }

  /**
   * Streaming : Groq streame token par token ; Gemini (pas de streaming
   * implémenté) renvoie sa réponse complète en un seul token.
   */
  async *generateStreamText(
    history: AiHistoryMessage[],
    content: string,
    targetLanguage = 'English'
  ): AsyncGenerator<string, void, unknown> {
    if (this.provider === 'groq') {
      yield* this.groqLiveService.generateStream(
        history,
        content,
        targetLanguage
      );
      return;
    }
    const text = await this.geminiLiveService.getGeminiChatResponse(
      history,
      content,
      undefined,
      undefined,
      targetLanguage
    );
    yield text;
  }
}
