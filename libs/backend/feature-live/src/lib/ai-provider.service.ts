import { Injectable } from '@nestjs/common';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import {
  GroqLiveService,
  GroqHistoryMessage,
} from './groq-live/groq-live.service';
import { OpenAiCompatService } from './openai-compat.service';

export type AiHistoryMessage = GroqHistoryMessage;

/**
 * Point d'entrée unique des providers IA.
 * Sélectionne le provider selon le paramètre actif ou AI_PROVIDER.
 */
@Injectable()
export class AiProviderService {
  constructor(
    private readonly geminiLiveService: GeminiLiveService,
    private readonly groqLiveService: GroqLiveService,
    private readonly openAiCompatService: OpenAiCompatService,
  ) {}

  get provider(): string {
    return process.env['AI_PROVIDER'] || 'gemini';
  }

  generateText(
    history: AiHistoryMessage[],
    content: string,
    options: {
      audioData?: string;
      mimeType?: string;
      targetLanguage?: string;
      model?: string;
      provider?: string;
      groqApiKey?: string;
      geminiApiKey?: string;
      customApiKey?: string;
    } = {},
  ): Promise<string> {
    const activeProvider = options.provider || this.provider;

    if (activeProvider === 'groq' && !options.audioData) {
      return this.groqLiveService.getGroqChatResponse(
        history,
        content,
        options.targetLanguage || 'English',
        options.model,
        options.groqApiKey || options.customApiKey,
      );
    }

    if (activeProvider === 'gemini' || options.audioData) {
      return this.geminiLiveService.getGeminiChatResponse(
        history,
        content,
        options.audioData,
        options.mimeType,
        options.targetLanguage,
        options.model,
        options.geminiApiKey || options.customApiKey,
      );
    }

    return this.openAiCompatService.getChatResponse(
      activeProvider,
      history,
      content,
      options.targetLanguage || 'English',
      options.model,
      options.customApiKey,
    );
  }

  async *generateStreamText(
    history: AiHistoryMessage[],
    content: string,
    targetLanguage = 'English',
    options: {
      model?: string;
      provider?: string;
      groqApiKey?: string;
      geminiApiKey?: string;
      customApiKey?: string;
    } = {},
  ): AsyncGenerator<string, void, unknown> {
    const activeProvider = options.provider || this.provider;

    if (activeProvider === 'groq') {
      yield* this.groqLiveService.generateStream(
        history,
        content,
        targetLanguage,
        options.model,
        options.groqApiKey || options.customApiKey,
      );
      return;
    }

    if (activeProvider === 'gemini') {
      const text = await this.geminiLiveService.getGeminiChatResponse(
        history,
        content,
        undefined,
        undefined,
        targetLanguage,
        options.model,
        options.geminiApiKey || options.customApiKey,
      );
      yield text;
      return;
    }

    yield* this.openAiCompatService.generateStream(
      activeProvider,
      history,
      content,
      targetLanguage,
      options.model,
      options.customApiKey,
    );
  }
}
