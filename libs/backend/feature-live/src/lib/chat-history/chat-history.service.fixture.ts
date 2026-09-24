/**
 * Shared test fixture — in-memory ChatHistoryService (no NestJS DI).
 * Extracted from chat-history.service.spec.ts (T100) so CRUD and
 * pagination specs can share one implementation.
 */
import { MockPrismaService } from '../shared/testing/mock-prisma.service.ts';

export class ChatHistoryService {
  private readonly pinnedSessionIds = new Set<string>();

  constructor(private readonly prisma: MockPrismaService) {}

  isSessionPinned(sessionId: string): boolean {
    return this.pinnedSessionIds.has(sessionId);
  }

  setSessionPinned(sessionId: string, isPinned: boolean): void {
    if (isPinned) {
      this.pinnedSessionIds.add(sessionId);
    } else {
      this.pinnedSessionIds.delete(sessionId);
    }
  }

  async createSession(learningLanguage = 'en', userId?: string) {
    return this.prisma.session.create({ data: { learningLanguage, userId } });
  }

  async getSession(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });
  }

  async getAllSessions(userId?: string) {
    return this.prisma.session.findMany(
      userId ? { where: { userId } } : undefined,
    );
  }

  async addMessage(sessionId: string, role: 'user' | 'model', content: string) {
    const message = await this.prisma.message.create({
      data: { sessionId, role, content },
    });

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });

    if (session && !session.title && role === 'user') {
      const title =
        content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { title },
      });
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getSessionHistory(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) return [];
    return session.messages.map((msg: any) => ({
      role: msg.role as 'user' | 'model',
      text: msg.content,
    }));
  }

  async deleteSession(sessionId: string) {
    this.pinnedSessionIds.delete(sessionId);
    await this.prisma.message.deleteMany({ where: { sessionId } });
    return this.prisma.session.delete({ where: { id: sessionId } });
  }

  async forkSession(sourceSessionId: string) {
    const source = await this.getSession(sourceSessionId);
    if (!source) throw new Error(`Session ${sourceSessionId} not found`);

    const newSession = await this.prisma.session.create({
      data: {
        learningLanguage: source.learningLanguage ?? 'en',
        title: source.title ?? 'Shared Conversation',
      },
    });

    if (source.messages.length > 0) {
      await this.prisma.message.createMany({
        data: source.messages.map((msg: any) => ({
          sessionId: newSession.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
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

    if (isPinned !== undefined) {
      this.setSessionPinned(sessionId, isPinned);
    }

    if (Object.keys(prismaData).length === 0) {
      return this.getSession(sessionId);
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: prismaData,
    });
  }
}
