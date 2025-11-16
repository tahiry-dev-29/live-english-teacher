import { Injectable } from '@nestjs/common';
import { LiveInputDto } from '../dto/live-input.dto';
import { Socket } from 'socket.io';
import { PrismaService } from '@live-english-teacher/data-access-prisma';

@Injectable()
export class GeminiLiveService {
  
  constructor(private readonly prisma: PrismaService) {}

  async handleLiveInput(userId: string, input: LiveInputDto, socket: Socket): Promise<void> {
    const userMessage = input.content.trim();
    if (!userMessage) return;

    try {
      await this.prisma.conversation.create({ 
        data: { 
          userId, 
          content: userMessage, 
          role: 'user' 
        } 
      });

      const teacherResponse = `That is a very interesting topic, ${userId.substring(0, 6)}! To answer your question about "${userMessage}", let's focus on the present perfect tense.`;
      let fullAiResponse = '';

      for (const char of teacherResponse) {
        socket.emit('live_output', { text: char }); 
        fullAiResponse += char;
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      
      await this.prisma.conversation.create({ 
        data: { 
          userId, 
          content: fullAiResponse, 
          role: 'teacher' 
        } 
      });

      socket.emit('live_response_end'); 

    } catch (error) {
      console.error('Error in live session (saving/streaming):', error);
      socket.emit('live_error', 'An error occurred during the session.');
    }
  }

  async getConversationHistory(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }
}