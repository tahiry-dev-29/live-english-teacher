/** Shared inline doubles for live-resolver specs (task 98 split). */
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
    return s.messages.map((m: MockMessageRow) => ({
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
        data: source.messages.map((m: MockMessageRow) => ({
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

