import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AudioResponse, ChatResponse } from '../shared/dto/live-response.dto';
import {
  SessionResponse,
  SessionDetailResponse,
  MessageResponse,
  UpdateSessionInput,
  ForkSessionResponse,
} from './live-resolver.types';
import { GeminiLiveService } from '../transcribe/gemini-live/gemini-live.service';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { LiveChatService } from './live-chat.service';

@Resolver()
export class LiveResolver {
  constructor(
    private readonly geminiLiveService: GeminiLiveService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly liveChatService: LiveChatService,
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
      isPinned:
        session.isPinned || this.chatHistoryService.isSessionPinned(session.id),
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
      isPinned:
        session.isPinned || this.chatHistoryService.isSessionPinned(session.id),
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
    /** Invisible LLM-only context — never stored, history keeps raw text. */
    @Args('context', { nullable: true }) context?: string,
    @Context() contextHeaders?: { req?: { headers?: Record<string, string> } },
  ): Promise<ChatResponse> {
    const headers = contextHeaders?.req?.headers ?? {};
    const providerHeader = headers['x-provider-api-key'];
    const customApiKey =
      providerHeader ||
      (provider ? headers[`x-${provider}-api-key`] : undefined);
    return this.liveChatService.chat(content, {
      sessionId,
      audioData,
      mimeType,
      targetLanguage,
      model,
      provider,
      context,
      groqApiKey: headers['x-groq-api-key'],
      geminiApiKey: headers['x-gemini-api-key'],
      customApiKey,
    });
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
      {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
      },
    );
    if (!session) return null;

    return {
      ...session,
      title: session.title || 'New Conversation',
      learningLanguage: session.learningLanguage ?? undefined,
      isPinned:
        data.isPinned !== undefined
          ? data.isPinned
          : session.isPinned ||
            this.chatHistoryService.isSessionPinned(session.id),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  @Mutation(() => Boolean)
  async deleteSession(@Args('sessionId') sessionId: string): Promise<boolean> {
    try {
      await this.chatHistoryService.deleteSession(sessionId);
      return true;
    } catch (err) {
      console.error(
        `[deleteSession] Failed to delete session ${sessionId}:`,
        err,
      );
      return false;
    }
  }

  @Mutation(() => ForkSessionResponse)
  async forkSession(
    @Args('sessionId') sessionId: string,
  ): Promise<ForkSessionResponse> {
    const newSession = await this.chatHistoryService.forkSession(sessionId);
    return {
      id: newSession.id,
      title: newSession.title ?? 'Shared Conversation',
      createdAt: newSession.createdAt.toISOString(),
    };
  }
}
