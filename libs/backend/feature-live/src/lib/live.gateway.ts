import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { LiveInputDto } from './dto/live-input.dto';

@WebSocketGateway({ 
  cors: {
    origin: '*', 
  },
})
@UsePipes(new ValidationPipe({ transform: true }))
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server | undefined;
  private readonly logger = new Logger(LiveGateway.name);

  
  private chatHistory = new Map<string, { role: 'user' | 'model', text: string }[]>();

  constructor(
    private readonly geminiLiveService: GeminiLiveService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.chatHistory.set(client.id, []);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.chatHistory.delete(client.id);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, data: LiveInputDto): Promise<void> {
    const { content, type } = data;
    const clientId = client.id;
    const history = this.chatHistory.get(clientId) || [];

    this.logger.log(`Input (${type}) from ${clientId}: ${content.substring(0, 50)}...`);

    history.push({ role: 'user', text: content });
    this.chatHistory.set(clientId, history);    
    const aiTextResponse = await this.geminiLiveService.getGeminiChatResponse(history, content);

    history.push({ role: 'model', text: aiTextResponse });
    this.chatHistory.set(clientId, history);

    client.emit('aiResponse', { text: aiTextResponse });

    const audioData = await this.geminiLiveService.getGeminiTtsAudio(aiTextResponse);

    if (audioData) {
        client.emit('aiAudio', { base64Data: audioData.audioData, mimeType: audioData.mimeType });
        this.logger.log(`Sent audio data to ${clientId}.`);
    } else {
        this.logger.warn(`Failed to generate TTS audio for ${clientId}.`);
        client.emit('error', { message: "AI voice failed to generate. Check server logs." });
    }
  }

    @SubscribeMessage('clearHistory')
  handleClearHistory(client: Socket): void {
      this.chatHistory.set(client.id, []);
      client.emit('historyCleared', { message: "Conversation history has been cleared." });
      this.logger.log(`History cleared for ${client.id}.`);
  }
}