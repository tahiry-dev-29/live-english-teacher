/** Controller/chat doubles for ai-stream specs (task 98 split). */
import { MockPrismaService } from '../shared/testing/mock-prisma.service.ts';
export { MockPrismaService };
export class ChatHistoryService {
  private readonly pinnedSessionIds = new Set<string>();
  constructor(private readonly prisma: MockPrismaService) {}

  isSessionPinned(id: string) {
    return this.pinnedSessionIds.has(id);
  }
  setSessionPinned(id: string, v: boolean) {
    if (v) {
      this.pinnedSessionIds.add(id);
    } else {
      this.pinnedSessionIds.delete(id);
    }
  }

  async createSession(lang = 'en') {
    return this.prisma.session.create({ data: { learningLanguage: lang } });
  }

  async getSession(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: { messages: true },
    });
  }

  async addMessage(sessionId: string, role: 'user' | 'model', content: string) {
    const msg = await this.prisma.message.create({
      data: { sessionId, role, content },
    });
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
    return msg;
  }

  async getSessionHistory(sessionId: string) {
    const s = await this.getSession(sessionId);
    if (!s) return [];
    return s.messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      text: m.content,
    }));
  }

  async updateSession(
    sessionId: string,
    data: { title?: string; learningLanguage?: string; isPinned?: boolean },
  ) {
    const { isPinned, ...prismaData } = data;
    if (isPinned !== undefined) this.setSessionPinned(sessionId, isPinned);
    if (Object.keys(prismaData).length === 0) return this.getSession(sessionId);
    return this.prisma.session.update({
      where: { id: sessionId },
      data: prismaData,
    });
  }
}

// ── Inline AiStreamController (without NestJS decorators) ────────────────────

export class AiStreamController {
  constructor(
    private readonly aiModelsService: ModelsDouble,
    private readonly aiProviderService: ProviderDouble,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly ttsProviderService: TtsDouble,
    private readonly groqTranscribeService: TranscribeDouble,
  ) {}

  async getModels(keys: Record<string, string | undefined> = {}) {
    return this.aiModelsService.getModels({ keys });
  }

  getTtsProviders() {
    return this.ttsProviderService.getProviders();
  }

  async getVoices(provider?: string, apiKey?: string) {
    return this.ttsProviderService.getVoices({ provider, apiKey });
  }

  async transcribe(
    dto: {
      audioData: string;
      mimeType?: string;
      language?: string;
      model?: string;
    },
    groqApiKey?: string,
  ) {
    const transcript = await this.groqTranscribeService.transcribe(
      dto.audioData,
      dto.mimeType,
      dto.language,
      dto.model,
      groqApiKey,
    );
    if (transcript === null) {
      throw new Error('Transcription failed or service unavailable');
    }
    return { transcript };
  }

  async tts(
    dto: {
      text: string;
      provider?: string;
      voiceId?: string;
      modelId?: string;
      targetLanguage?: string;
    },
    headers: Record<string, string | undefined> = {},
  ) {
    const provider =
      dto.provider ||
      headers['x-tts-provider'] ||
      headers['x-provider'] ||
      'elevenlabs';
    const audio = await this.ttsProviderService.synthesize({
      provider,
      text: dto.text,
      voiceId: dto.voiceId,
      modelId: dto.modelId,
      targetLanguage: dto.targetLanguage,
    });
    if (!audio) throw new Error(`TTS not available for provider "${provider}"`);
    return audio;
  }

  /** Simplified stream test helper (actual SSE streaming not testable here) */
  async processStreamChat(
    dto: {
      message: string;
      sessionId?: string;
      targetLanguage?: string;
      model?: string;
      provider?: string;
    },
    _headers: Record<string, string | undefined> = {},
  ) {
    let sessionId = dto.sessionId || '';
    const session = sessionId
      ? await this.chatHistoryService.getSession(sessionId)
      : null;
    if (!session) {
      const created = await this.chatHistoryService.createSession(
        dto.targetLanguage || 'en',
      );
      sessionId = created.id;
    } else if (
      dto.targetLanguage &&
      session.learningLanguage !== dto.targetLanguage
    ) {
      await this.chatHistoryService.updateSession(sessionId, {
        learningLanguage: dto.targetLanguage,
      });
    }
    const history = await this.chatHistoryService.getSessionHistory(sessionId);
    if (dto.message)
      await this.chatHistoryService.addMessage(sessionId, 'user', dto.message);

    const tokens: string[] = [];
    const stream = this.aiProviderService.generateStreamText(
      history,
      dto.message,
      dto.targetLanguage || 'English',
      {
        model: dto.model,
        provider: dto.provider,
      },
    );
    let fullText = '';
    for await (const token of stream) {
      tokens.push(token);
      fullText += token;
    }
    if (fullText)
      await this.chatHistoryService.addMessage(sessionId, 'model', fullText);
    return { sessionId, tokens, fullText };
  }
}

// ── Mock factories ────────────────────────────────────────────────────────────

