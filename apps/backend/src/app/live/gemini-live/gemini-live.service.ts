import { Injectable } from '@nestjs/common';
import { LiveInputDto } from '../dto/live-input.dto';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma'; 

@Injectable()
export class GeminiLiveService {
  
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handles user input, simulates streaming output, and saves conversation history.
   * @param userId - ID of the connected user.
   * @param input - The user's message and type.
   * @param socket - The client socket for real-time response streaming.
   */
  async handleLiveInput(userId: string, input: LiveInputDto, socket: Socket): Promise<void> {
    const userMessage = input.content.trim();
    if (!userMessage) return;

    try {
      // 1. Save user message to history
      await this.prisma.conversation.create({ 
        data: { 
          userId, 
          content: userMessage, 
          role: 'user' 
        } 
      });

      // Professional comment: Logic will eventually connect to Gemini API here.
      const teacherResponse = `That is a very interesting topic, ${userId.substring(0, 6)}! To answer your question about "${userMessage}", let's focus on the present perfect tense.`;
      let fullAiResponse = '';

      // 2. Simulate streaming back to the client socket
      for (const char of teacherResponse) {
        // Emit in chunks to simulate streaming
        socket.emit('live_output', { text: char }); 
        fullAiResponse += char;
        await new Promise(resolve => setTimeout(resolve, 5)); // Delay for smooth effect
      }
      
      // 3. Save the full AI response after streaming is complete
      await this.prisma.conversation.create({ 
        data: { 
          userId, 
          content: fullAiResponse, 
          role: 'teacher' 
        } 
      });

      // Professional comment: Signal the end of the response for frontend state management
      socket.emit('live_response_end'); 

    } catch (error) {
      console.error('Error in live session (saving/streaming):', error);
      socket.emit('live_error', 'An error occurred during the session.');
    }
  }

  // Professional comment: Future method to fetch conversation history on connection
  async getConversationHistory(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
// Professional comment: Handles AI, streaming, and database history management.