import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { AudioResponse, ChatResponse } from './dto/live-response.dto';

@Resolver()
export class LiveResolver {
  constructor(private readonly geminiLiveService: GeminiLiveService) {}

  @Mutation(() => ChatResponse)
  async chat(@Args('content') content: string): Promise<ChatResponse> {
    // For simple GraphQL testing, we use a stateless approach or empty history.
    // In a real app, you might pass a session ID or the full history.
    const history = []; 
    const text = await this.geminiLiveService.getGeminiChatResponse(history, content);
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
