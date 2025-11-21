import { Args, Mutation, Query, Resolver, Field, ObjectType, InputType } from '@nestjs/graphql';
import { AudioResponse, ChatResponse } from './dto/live-response.dto';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { ChatHistoryService } from './chat-history/chat-history.service';

// GraphQL Types
@ObjectType()
class SessionResponse {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  learningLanguage?: string;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;

  @Field({ nullable: true })
  lastMessage?: string;
}

@ObjectType()
class MessageResponse {
  @Field()
  role!: string;

  @Field()
  content!: string;

  @Field()
  createdAt!: string;
}

@ObjectType()
class SessionDetailResponse {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field()
  learningLanguage!: string;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;

  @Field(() => [MessageResponse])
  messages!: MessageResponse[];
}

@InputType()
class UpdateSessionInput {
  @Field()
  sessionId!: string;

  @Field({ nullable: true })
  title?: string;
}

@Resolver()
export class LiveResolver {
  constructor(
    private readonly geminiLiveService: GeminiLiveService,
    private readonly chatHistoryService: ChatHistoryService
  ) {}

  @Query(() => String)
  hello(): string {
    return 'Hello World!';
  }

  @Query(() => [SessionResponse])
  async getSessions(): Promise<SessionResponse[]> {
    const sessions = await this.chatHistoryService.getAllSessions();
    return sessions.map((session) => ({
      id: session.id,
      title: session.title || 'New Conversation',
      learningLanguage: session.learningLanguage || undefined,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      lastMessage: session.messages?.[0]?.content,
    }));
  }

  @Query(() => SessionDetailResponse, { nullable: true })
  async getSession(@Args('sessionId') sessionId: string): Promise<SessionDetailResponse | null> {
    const session = await this.chatHistoryService.getSession(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      title: session.title || 'New Conversation',
      learningLanguage: session.learningLanguage,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      messages: session.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
    };
  }

  @Query(() => [MessageResponse])
  async sessionMessages(@Args('sessionId') sessionId: string): Promise<MessageResponse[]> {
    const session = await this.chatHistoryService.getSession(sessionId);
    if (!session) return [];

    return session.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }));
  }

  @Mutation(() => ChatResponse)
  async chat(
    @Args('content') content: string,
    @Args('sessionId') sessionId: string,
    @Args('audioData', { nullable: true }) audioData?: string,
    @Args('mimeType', { nullable: true }) mimeType?: string,
    @Args('targetLanguage', { nullable: true, defaultValue: 'en' }) targetLanguage?: string
  ): Promise<ChatResponse> {
    // Check if session exists, if not create it
    let session = await this.chatHistoryService.getSession(sessionId);
    if (!session) {
      const newSession = await this.chatHistoryService.createSession(targetLanguage);
      session = { ...newSession, messages: [] };
      // Update sessionId to the newly created one
      sessionId = session.id;
    }

    // Get history from database
    const history = await this.chatHistoryService.getSessionHistory(sessionId);

    // Add user message to database (only text for now)
    if (content) {
      await this.chatHistoryService.addMessage(sessionId, 'user', content);
    }

    const text = await this.geminiLiveService.getGeminiChatResponse(
      history,
      content,
      audioData,
      mimeType,
      targetLanguage
    );

    // Add model response to database
    await this.chatHistoryService.addMessage(sessionId, 'model', text);

    // Generate audio for the response
    let responseAudioData: string | undefined;
    let responseMimeType: string | undefined;

    try {
      const audioResult = await this.geminiLiveService.getGeminiTtsAudio(text, targetLanguage);
      if (audioResult) {
        responseAudioData = audioResult.audioData;
        responseMimeType = audioResult.mimeType;
        console.log('Audio generated for response:', {
          mimeType: responseMimeType,
          dataLength: responseAudioData?.length,
          firstChars: responseAudioData?.substring(0, 50),
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
      mimeType: responseMimeType,
      sessionId, // Return the sessionId so frontend can use it
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

  @Mutation(() => SessionResponse, { nullable: true })
  async updateSession(@Args('data') data: UpdateSessionInput): Promise<SessionResponse | null> {
    const session = await this.chatHistoryService.updateSession(data.sessionId, { title: data.title });
    if (!session) return null;
    
    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  @Mutation(() => Boolean)
  async deleteSession(@Args('sessionId') sessionId: string): Promise<boolean> {
    try {
      await this.chatHistoryService.deleteSession(sessionId);
      return true;
    } catch {
      return false;
    }
  }
}

