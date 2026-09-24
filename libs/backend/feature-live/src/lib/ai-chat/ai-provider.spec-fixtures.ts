import {
  MockGeminiLiveService,
  MockGroqLiveService,
  MockOpenAiCompatService,
} from './ai-provider-mocks.spec-helper.ts';
export {
  MockGeminiLiveService,
  MockGroqLiveService,
  MockOpenAiCompatService,
} from './ai-provider-mocks.spec-helper.ts';

// ── Inline AiProviderService (without NestJS decorators) ─────────────────────

export type AiHistoryMessage = { role: 'user' | 'model'; text: string };

export class AiProviderService {
  private geminiLiveService: MockGeminiLiveService;
  private groqLiveService: MockGroqLiveService;
  private openAiCompatService: MockOpenAiCompatService;
  private envProvider: string;
  constructor(
    geminiLiveService: MockGeminiLiveService,
    groqLiveService: MockGroqLiveService,
    openAiCompatService: MockOpenAiCompatService,
    envProvider = 'gemini',
  ) {
    this.geminiLiveService = geminiLiveService;
    this.groqLiveService = groqLiveService;
    this.openAiCompatService = openAiCompatService;
    this.envProvider = envProvider;
  }

  get provider(): string {
    return this.envProvider;
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
    const activeProvider =
      options.provider && options.provider !== 'default'
        ? options.provider
        : this.provider;

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
    const activeProvider =
      options.provider && options.provider !== 'default'
        ? options.provider
        : this.provider;

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
