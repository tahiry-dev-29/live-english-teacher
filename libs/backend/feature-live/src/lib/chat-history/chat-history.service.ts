import { Injectable } from '@nestjs/common';
import { PrismaService } from '@live-languages-teacher/data-access-prisma';

@Injectable()
export class ChatHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(learningLanguage = 'en', userId?: string) {
    return this.prisma.session.create({
      data: {
        learningLanguage,
        userId,
      },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async getAllSessions(userId?: string) {
    return this.prisma.session.findMany({
      where: userId ? { userId } : {},
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async addMessage(sessionId: string, role: 'user' | 'model', content: string) {
    const message = await this.prisma.message.create({
      data: {
        sessionId,
        role,
        content,
      },
    });

    // Update session title if it's the first user message
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });

    if (session && !session.title && role === 'user') {
      // Use first user message as title (truncated)
      const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { title },
      });
    }

    // Update session updatedAt
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getSessionHistory(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) return [];
    
    return session.messages.map(msg => ({
      role: msg.role as 'user' | 'model',
      text: msg.content,
    }));
  }

  async deleteSession(sessionId: string) {
    return this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async updateSession(sessionId: string, data: { title?: string }) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data,
    });
  }
}
