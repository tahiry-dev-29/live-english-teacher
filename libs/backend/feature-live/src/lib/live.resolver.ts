import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AudioResponse, ChatResponse } from './dto/live-response.dto';
import {
  SessionResponse,
  SessionDetailResponse,
  MessageResponse,
  UpdateSessionInput,
} from './live-resolver.types';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { AiProviderService } from './ai-provider.service';
import { ChatHistoryService } from './chat-history/chat-history.service';
import { QuotaExceededError } from './groq-live/groq-live.service';

@Resolver()
export class LiveResolver {
  constructor(
    private readonly geminiLiveService: GeminiLiveService,
    private readonly aiProviderService: AiProviderService,
    private readonly chatHistoryService: ChatHistoryService,
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
  async getSession(
    @Args('sessionId') sessionId: string,
  ): Promise<SessionDetailResponse | null> {
    const session = await this.chatHistoryService.getSession(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      title: session.title || 'New Conversation',
      learningLanguage: session.learningLanguage ?? 'en',
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
  async sessionMessages(
    @Args('sessionId') sessionId: string,
  ): Promise<MessageResponse[]> {
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
    @Args('sessionId', { nullable: true }) sessionId?: string,
    @Args('audioData', { nullable: true }) audioData?: string,
    @Args('mimeType', { nullable: true }) mimeType?: string,
    @Args('targetLanguage', { nullable: true, defaultValue: 'en' })
    targetLanguage?: string,
    @Args('model', { nullable: true }) model?: string,
    @Args('provider', { nullable: true }) provider?: string,
    @Context() context?: { req?: { headers?: Record<string, string> } },
  ): Promise<ChatResponse> {
    const groqApiKey = context?.req?.headers?.['x-groq-api-key'];
    const geminiApiKey = context?.req?.headers?.['x-gemini-api-key'];

    // New chat : aucun sessionId envoyé par le frontend -> le backend
    // crée la session (Prisma @default(uuid())) et retourne son id.
    let session = sessionId
      ? await this.chatHistoryService.getSession(sessionId)
      : null;
    if (!session) {
      const newSession = await this.chatHistoryService.createSession(
        targetLanguage || 'en',
      );
      session = { ...newSession, messages: [] };
    } else if (targetLanguage && session.learningLanguage !== targetLanguage) {
      await this.chatHistoryService.updateSession(session.id, {
        learningLanguage: targetLanguage,
      });
    }

    sessionId = session.id;
    const history = await this.chatHistoryService.getSessionHistory(sessionId);

    if (content) {
      await this.chatHistoryService.addMessage(sessionId, 'user', content);
    }

    const providerHeader = context?.req?.headers?.['x-provider-api-key'];
    const customApiKey =
      providerHeader ||
      (provider ? context?.req?.headers?.[`x-${provider}-api-key`] : undefined);

    let text: string;
    try {
      text = await this.aiProviderService.generateText(history, content, {
        audioData,
        mimeType,
        targetLanguage,
        model,
        provider,
        groqApiKey,
        geminiApiKey,
        customApiKey,
      });
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
      throw err;
    }

    await this.chatHistoryService.addMessage(sessionId, 'model', text);

    let responseAudioData: string | undefined;
    let responseMimeType: string | undefined;

    try {
      const audioResult = await this.geminiLiveService.getGeminiTtsAudio(
        text,
        targetLanguage,
        geminiApiKey,
      );
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
      sessionId,
    };
  }

  @Mutation(() => AudioResponse, { nullable: true })
  async generateAudio(
    @Args('text') text: string,
  ): Promise<AudioResponse | null> {
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
  async updateSession(
    @Args('data') data: UpdateSessionInput,
  ): Promise<SessionResponse | null> {
    const session = await this.chatHistoryService.updateSession(
      data.sessionId,
      { title: data.title },
    );
    if (!session) return null;

    return {
      ...session,
      title: session.title || 'New Conversation',
      learningLanguage: session.learningLanguage ?? undefined,
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
