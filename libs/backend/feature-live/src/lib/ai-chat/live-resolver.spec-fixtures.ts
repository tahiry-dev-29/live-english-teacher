import { ChatHistoryService } from './live-resolver-doubles.spec-helper.ts';
import type { MockMessageRow } from './live-resolver-doubles.spec-helper.ts';

/** Minimal surfaces consumed by the inline resolver double. */
export interface ResolverGeminiDouble {
  getGeminiTtsAudio(
    text: string,
    targetLanguage?: string,
    apiKey?: string,
  ): Promise<{ audioData: string; mimeType: string } | null>;
}

export interface ResolverProviderDouble {
  generateText(
    history: { role: string; text: string }[],
    content: string,
    options?: Record<string, unknown>,
  ): Promise<string>;
}
export { ChatHistoryService, MockPrismaService } from './live-resolver-doubles.spec-helper.ts';

// ── Inline LiveResolver (without NestJS decorators) ───────────────────────────

export class LiveResolver {
  constructor(
    private readonly geminiLiveService: ResolverGeminiDouble,
    private readonly aiProviderService: ResolverProviderDouble,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  hello(): string {
    return 'Hello World!';
  }

  async getSessions() {
    const sessions = await this.chatHistoryService.getAllSessions();
    return sessions.map((s: MockMessageRow & { id: string }) => ({
      id: s.id,
      title: s.title || 'New Conversation',
      learningLanguage: s.learningLanguage,
      isPinned:
        Boolean(s.isPinned) || this.chatHistoryService.isSessionPinned(s.id),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      lastMessage: s.messages?.[0]?.content,
    }));
  }

  async getSession(sessionId: string) {
    const s = await this.chatHistoryService.getSession(sessionId);
    if (!s) return null;
    return {
      id: s.id,
      title: s.title || 'New Conversation',
      learningLanguage: s.learningLanguage ?? 'en',
      isPinned:
        Boolean(s.isPinned) || this.chatHistoryService.isSessionPinned(s.id),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      messages: s.messages.map((m: MockMessageRow) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async sessionMessages(sessionId: string) {
    const s = await this.chatHistoryService.getSession(sessionId);
    if (!s) return [];
    return s.messages.map((m: MockMessageRow) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async chat(
    content: string,
    sessionId?: string,
    targetLanguage?: string,
    model?: string,
    provider?: string,
    headers: Record<string, string> = {},
  ) {
    let session = sessionId
      ? await this.chatHistoryService.getSession(sessionId)
      : null;
    if (!session) {
      const ns = await this.chatHistoryService.createSession(
        targetLanguage || 'en',
      );
      session = { ...ns, messages: [] };
    }
    const sid = session.id;
    if (content) await this.chatHistoryService.addMessage(sid, 'user', content);
    const history = await this.chatHistoryService.getSessionHistory(sid);
    const text: string = await this.aiProviderService.generateText(
      history,
      content,
      { targetLanguage, model, provider, ...headers },
    );
    await this.chatHistoryService.addMessage(sid, 'model', text);

    let responseAudioData: string | undefined;
    let responseMimeType: string | undefined;
    try {
      const audioResult = await this.geminiLiveService.getGeminiTtsAudio(
        text,
        targetLanguage,
      );
      if (audioResult) {
        responseAudioData = audioResult.audioData;
        responseMimeType = audioResult.mimeType;
      }
    } catch {
      /* non-blocking */
    }

    return {
      text,
      audioData: responseAudioData,
      mimeType: responseMimeType,
      sessionId: sid,
    };
  }

  async generateAudio(text: string) {
    const result = await this.geminiLiveService.getGeminiTtsAudio(text);
    if (!result) return null;
    return { audioData: result.audioData, mimeType: result.mimeType };
  }

  async updateSession(data: {
    sessionId: string;
    title?: string;
    isPinned?: boolean;
  }) {
    const session = await this.chatHistoryService.updateSession(
      data.sessionId,
      {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
      },
    );
    if (!session) return null;
    return {
      id: session.id,
      title: session.title || 'New Conversation',
      learningLanguage: session.learningLanguage,
      isPinned:
        data.isPinned !== undefined
          ? data.isPinned
          : this.chatHistoryService.isSessionPinned(session.id),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  async deleteSession(sessionId: string) {
    try {
      await this.chatHistoryService.deleteSession(sessionId);
      return true;
    } catch {
      return false;
    }
  }

  async forkSession(sessionId: string) {
    const ns = await this.chatHistoryService.forkSession(sessionId);
    return {
      id: ns.id,
      title: ns.title || 'Shared Conversation',
      createdAt: ns.createdAt.toISOString(),
    };
  }
}
