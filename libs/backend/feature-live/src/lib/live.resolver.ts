import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AudioResponse, ChatResponse } from './dto/live-response.dto';
import { GeminiLiveService } from './gemini-live/gemini-live.service';

@Resolver()
export class LiveResolver {
  // Simple in-memory history storage
  private chatHistory = new Map<string, { role: 'user' | 'model', text: string }[]>();

  constructor(private readonly geminiLiveService: GeminiLiveService) {}


  @Query(() => String)
  hello(): string {
    return 'Hello World!';
  }

  @Mutation(() => ChatResponse)
  async chat(
    @Args('content') content: string,
    @Args('sessionId') sessionId: string,
    @Args('audioData', { nullable: true }) audioData?: string,
    @Args('mimeType', { nullable: true }) mimeType?: string
  ): Promise<ChatResponse> {
    const history = this.chatHistory.get(sessionId) || [];

    // Add user message to history (only text for now)
    if (content) {
        history.push({ role: 'user', text: content });
        this.chatHistory.set(sessionId, history);
    }

    const text = await this.geminiLiveService.getGeminiChatResponse(history, content, audioData, mimeType);

    // Add model response to history
    history.push({ role: 'model', text });
    this.chatHistory.set(sessionId, history);

    // Generate audio for the response
    let responseAudioData: string | undefined;
    let responseMimeType: string | undefined;
    
    try {
      const audioResult = await this.geminiLiveService.getGeminiTtsAudio(text);
      if (audioResult) {
        responseAudioData = audioResult.audioData;
        responseMimeType = audioResult.mimeType;
        console.log('Audio generated for response:', {
          mimeType: responseMimeType,
          dataLength: responseAudioData?.length,
          firstChars: responseAudioData?.substring(0, 50)
        });
      } else {
        console.warn('No audio result returned from TTS service');
      }
    } catch (error) {
      console.error('Failed to generate audio for response:', error);
    }

    return { 
      text,
      audioData: responseAudioData,
      mimeType: responseMimeType
    };
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
