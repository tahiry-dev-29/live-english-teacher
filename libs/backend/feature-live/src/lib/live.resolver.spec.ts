/**
 * Unit tests — LiveResolver (GraphQL API)
 *
 * Tests all GraphQL queries and mutations:
 * hello, getSessions, getSession, sessionMessages,
 * chat, generateAudio, updateSession, deleteSession, forkSession.
 *
 * All external dependencies (Prisma, Gemini, AI) are mocked in-memory.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPrismaService } from './testing/mock-prisma.service.ts';

// ── Inline ChatHistoryService (without NestJS decorators) ────────────────────

class ChatHistoryService {
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

  async createSession(lang = 'en', userId?: string) {
    return this.prisma.session.create({
      data: { learningLanguage: lang, userId },
    });
  }

  async getSession(id: string) {
    return this.prisma.session.findUnique({
      where: { id },
      include: { messages: true },
    });
  }

  async getAllSessions() {
    return this.prisma.session.findMany();
  }

  async addMessage(sessionId: string, role: 'user' | 'model', content: string) {
    const msg = await this.prisma.message.create({
      data: { sessionId, role, content },
    });
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });
    if (session && !session.title && role === 'user') {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        },
      });
    }
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });
    return msg;
  }

  async getSessionHistory(sessionId: string) {
    const s = await this.getSession(sessionId);
    if (!s) return [];
    return s.messages.map((m: any) => ({
      role: m.role as 'user' | 'model',
      text: m.content,
    }));
  }

  async deleteSession(sessionId: string) {
    this.pinnedSessionIds.delete(sessionId);
    await this.prisma.message.deleteMany({ where: { sessionId } });
    return this.prisma.session.delete({ where: { id: sessionId } });
  }

  async forkSession(sourceId: string) {
    const source = await this.getSession(sourceId);
    if (!source) throw new Error(`Session ${sourceId} not found`);
    const newSession = await this.prisma.session.create({
      data: {
        learningLanguage: source.learningLanguage ?? 'en',
        title: source.title ?? 'Shared Conversation',
      },
    });
    if (source.messages.length > 0) {
      await this.prisma.message.createMany({
        data: source.messages.map((m: any) => ({
          sessionId: newSession.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      });
    }
    return newSession;
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

// ── Inline LiveResolver (without NestJS decorators) ───────────────────────────

class LiveResolver {
  constructor(
    private readonly geminiLiveService: any,
    private readonly aiProviderService: any,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  hello(): string {
    return 'Hello World!';
  }

  async getSessions() {
    const sessions = await this.chatHistoryService.getAllSessions();
    return sessions.map((s: any) => ({
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
      messages: s.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async sessionMessages(sessionId: string) {
    const s = await this.chatHistoryService.getSession(sessionId);
    if (!s) return [];
    return s.messages.map((m: any) => ({
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

// ── Test Setup ────────────────────────────────────────────────────────────────

let prisma: MockPrismaService;
let chatHistoryService: ChatHistoryService;
let resolver: LiveResolver;
let mockGemini: any;
let mockAiProvider: any;

describe('LiveResolver — GraphQL API', () => {
  beforeEach(() => {
    prisma = new MockPrismaService();
    chatHistoryService = new ChatHistoryService(prisma);
    mockGemini = {
      getGeminiTtsAudio: async () => ({
        audioData: 'b64audio==',
        mimeType: 'audio/mpeg',
      }),
    };
    mockAiProvider = {
      generateText: async () => '### AI Response\n\n- Point 1\n- Point 2',
    };
    resolver = new LiveResolver(mockGemini, mockAiProvider, chatHistoryService);
  });

  // ── hello ─────────────────────────────────────────────────────────────────

  describe('hello()', () => {
    it('returns the greeting string', () => {
      assert.equal(resolver.hello(), 'Hello World!');
    });
  });

  // ── getSessions ───────────────────────────────────────────────────────────

  describe('getSessions()', () => {
    it('returns all sessions', async () => {
      await chatHistoryService.createSession('en');
      await chatHistoryService.createSession('fr');
      const sessions = await resolver.getSessions();
      assert.ok(sessions.length >= 2);
    });

    it('returns sessions with correct isPinned state', async () => {
      const s1 = await chatHistoryService.createSession('en');
      const s2 = await chatHistoryService.createSession('fr');
      chatHistoryService.setSessionPinned(s1.id, true);

      const sessions = await resolver.getSessions();
      const found1 = sessions.find((s: any) => s.id === s1.id)!;
      const found2 = sessions.find((s: any) => s.id === s2.id)!;
      assert.equal(found1.isPinned, true);
      assert.equal(found2.isPinned, false);
    });

    it('returns "New Conversation" as default title', async () => {
      await chatHistoryService.createSession('en');
      const sessions = await resolver.getSessions();
      assert.ok(sessions.some((s: any) => s.title === 'New Conversation'));
    });

    it('returns ISO string for dates', async () => {
      await chatHistoryService.createSession();
      const sessions = await resolver.getSessions();
      assert.ok(!isNaN(Date.parse(sessions[0].createdAt)));
    });
  });

  // ── getSession ────────────────────────────────────────────────────────────

  describe('getSession()', () => {
    it('returns session detail with messages', async () => {
      const s = await chatHistoryService.createSession('en');
      await chatHistoryService.addMessage(s.id, 'user', 'What is a verb?');
      await chatHistoryService.addMessage(
        s.id,
        'model',
        'A verb expresses action.',
      );

      const detail = await resolver.getSession(s.id);
      assert.ok(detail);
      assert.equal(detail.messages.length, 2);
    });

    it('reflects the isPinned state', async () => {
      const s = await chatHistoryService.createSession('en');
      chatHistoryService.setSessionPinned(s.id, true);
      const detail = await resolver.getSession(s.id);
      assert.equal(detail!.isPinned, true);
    });

    it('returns null for a non-existent session', async () => {
      const result = await resolver.getSession('ghost');
      assert.equal(result, null);
    });
  });

  // ── sessionMessages ───────────────────────────────────────────────────────

  describe('sessionMessages()', () => {
    it('returns messages for a session', async () => {
      const s = await chatHistoryService.createSession('en');
      await chatHistoryService.addMessage(s.id, 'user', 'Hi');
      await chatHistoryService.addMessage(s.id, 'model', 'Hello!');
      const msgs = await resolver.sessionMessages(s.id);
      assert.equal(msgs.length, 2);
    });

    it('returns empty array for non-existent session', async () => {
      const msgs = await resolver.sessionMessages('ghost');
      assert.deepEqual(msgs, []);
    });
  });

  // ── chat ──────────────────────────────────────────────────────────────────

  describe('chat()', () => {
    it('creates a new session and returns AI markdown response', async () => {
      const res = await resolver.chat('Teach me French verbs');
      assert.ok(res.sessionId);
      assert.ok(res.text.includes('### AI Response'));
    });

    it('saves user and model messages to the session history', async () => {
      const res = await resolver.chat('Hello');
      const history = await chatHistoryService.getSessionHistory(res.sessionId);
      assert.equal(history.length, 2);
      assert.equal(history[0].role, 'user');
      assert.equal(history[1].role, 'model');
    });

    it('reuses an existing session', async () => {
      const first = await resolver.chat('First message');
      const second = await resolver.chat('Second message', first.sessionId);
      assert.equal(first.sessionId, second.sessionId);
      const history = await chatHistoryService.getSessionHistory(
        first.sessionId,
      );
      assert.equal(history.length, 4); // 2 user + 2 model
    });

    it('creates a new session if sessionId refers to non-existent session', async () => {
      const res = await resolver.chat('Hello', 'ghost-id');
      assert.ok(res.sessionId);
      assert.notEqual(res.sessionId, 'ghost-id');
    });

    it('includes audioData in the response from Gemini TTS', async () => {
      const res = await resolver.chat('Hello');
      assert.equal(res.audioData, 'b64audio==');
      assert.equal(res.mimeType, 'audio/mpeg');
    });

    it('gracefully continues if Gemini TTS throws', async () => {
      mockGemini.getGeminiTtsAudio = async () => {
        throw new Error('TTS down');
      };
      resolver = new LiveResolver(
        mockGemini,
        mockAiProvider,
        chatHistoryService,
      );
      const res = await resolver.chat('Hello');
      assert.ok(res.text);
      assert.equal(res.audioData, undefined);
    });
  });

  // ── generateAudio ─────────────────────────────────────────────────────────

  describe('generateAudio()', () => {
    it('returns audio data for valid text', async () => {
      const result = await resolver.generateAudio('Hello student');
      assert.ok(result);
      assert.equal(result!.mimeType, 'audio/mpeg');
    });

    it('returns null when Gemini TTS returns null', async () => {
      mockGemini.getGeminiTtsAudio = async () => null;
      resolver = new LiveResolver(
        mockGemini,
        mockAiProvider,
        chatHistoryService,
      );
      const result = await resolver.generateAudio('Hello');
      assert.equal(result, null);
    });
  });

  // ── updateSession ─────────────────────────────────────────────────────────

  describe('updateSession()', () => {
    it('updates title and isPinned', async () => {
      const s = await chatHistoryService.createSession('en');
      const updated = await resolver.updateSession({
        sessionId: s.id,
        title: 'My French Lesson',
        isPinned: true,
      });
      assert.ok(updated);
      assert.equal(updated.title, 'My French Lesson');
      assert.equal(updated.isPinned, true);
      assert.equal(chatHistoryService.isSessionPinned(s.id), true);
    });

    it('unpins a session', async () => {
      const s = await chatHistoryService.createSession('en');
      chatHistoryService.setSessionPinned(s.id, true);
      await resolver.updateSession({ sessionId: s.id, isPinned: false });
      assert.equal(chatHistoryService.isSessionPinned(s.id), false);
    });
  });

  // ── deleteSession ─────────────────────────────────────────────────────────

  describe('deleteSession()', () => {
    it('deletes the session and returns true', async () => {
      const s = await chatHistoryService.createSession('en');
      const result = await resolver.deleteSession(s.id);
      assert.equal(result, true);
      assert.equal(await chatHistoryService.getSession(s.id), null);
    });

    it('returns false for a non-existent session', async () => {
      const result = await resolver.deleteSession('ghost-id');
      assert.equal(result, false);
    });
  });

  // ── forkSession ───────────────────────────────────────────────────────────

  describe('forkSession()', () => {
    it('creates a forked session with a different ID', async () => {
      const s = await chatHistoryService.createSession('en');
      await chatHistoryService.addMessage(s.id, 'user', 'Original message');

      const fork = await resolver.forkSession(s.id);
      assert.ok(fork.id);
      assert.notEqual(fork.id, s.id);
      assert.ok(fork.title);
      assert.ok(!isNaN(Date.parse(fork.createdAt)));
    });
  });
});
