import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { AudioResponse, ChatResponse } from './dto/live-response.dto';

@Resolver()
export class LiveResolver {
  // Simple in-memory history storage
  private chatHistory = new Map<string, { role: 'user' | 'model', text: string }[]>();

  constructor(private readonly geminiLiveService: GeminiLiveService) {}

  @Mutation(() => ChatResponse)
  async chat(
    @Args('content') content: string,
    @Args('sessionId') sessionId: string
  ): Promise<ChatResponse> {
    const history = this.chatHistory.get(sessionId) || [];

    // Add user message to history
    history.push({ role: 'user', text: content });
    this.chatHistory.set(sessionId, history);

    const text = await this.geminiLiveService.getGeminiChatResponse(history, content);

    // Add model response to history
    history.push({ role: 'model', text });
    this.chatHistory.set(sessionId, history);

    return { text };
  }

  @Mutation(() => AudioResponse, { nullable: true })
  async generateAudio(@Args('text') text: string): Promise<AudioResponse | null> {
    const result = await this.geminiLiveService.getGeminiTtsAudio(text);
    if (!result) {
      return null;
    }
    return {
      audioData: result.audioData,
      mimeType: result.mimeType,
    };
  }
}
