import { Injectable } from '@nestjs/common';
import { ChatResponse } from '../shared/dto/live-response.dto';
import { AiProviderService } from './ai-provider.service';
import { GeminiLiveService } from '../transcribe/gemini-live/gemini-live.service';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { combineMessageWithContext } from '../chat-history/chat-context.util';
import { SessionTitleService } from '../chat-history/session-title.service';
import { QuotaExceededError } from '../transcribe/groq-live/groq-live.service';

export interface LiveChatOptions {
  sessionId?: string;
  audioData?: string;
  mimeType?: string;
  targetLanguage?: string;
  model?: string;
  provider?: string;
  context?: string;
  groqApiKey?: string;
  geminiApiKey?: string;
  customApiKey?: string;
}

/** Chat mutation orchestration extracted from LiveResolver (testable). */
@Injectable()
export class LiveChatService {
  constructor(
    private readonly geminiLiveService: GeminiLiveService,
    private readonly aiProviderService: AiProviderService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly sessionTitleService: SessionTitleService,
  ) {}

  async chat(content: string, options: LiveChatOptions = {}): Promise<ChatResponse> {
    const {
      targetLanguage,
      model,
      provider,
      audioData,
      mimeType,
      context,
      groqApiKey,
      geminiApiKey,
      customApiKey,
    } = options;
    let session = options.sessionId
      ? await this.chatHistoryService.getSession(options.sessionId)
      : null;
    const isNewSession = !session;
    if (!session) {
      const created = await this.chatHistoryService.createSession(
        targetLanguage || 'en',
      );
      session = { ...created, messages: [] };
    } else if (targetLanguage && session.learningLanguage !== targetLanguage) {
      await this.chatHistoryService.updateSession(session.id, {
        learningLanguage: targetLanguage,
      });
    }
    const sessionId = session.id;
    const history = await this.chatHistoryService.getSessionHistory(sessionId);
    if (content) {
      await this.chatHistoryService.addMessage(sessionId, 'user', content);
    }
    let text: string;
    try {
      text = await this.aiProviderService.generateText(
        history,
        combineMessageWithContext(content, context),
        {
          audioData,
          mimeType,
          targetLanguage,
          model,
          provider,
          groqApiKey,
          geminiApiKey,
          customApiKey,
        },
      );
    } catch (err) {
      if (err instanceof QuotaExceededError) throw err;
      throw err;
    }
    await this.chatHistoryService.addMessage(sessionId, 'model', text);
    if (isNewSession) {
      const source = content?.trim() ? content : text;
      await this.sessionTitleService.generateAndApply(sessionId, source, {
        targetLanguage,
        model,
        provider,
        groqApiKey,
        geminiApiKey,
        customApiKey,
      });
    }
    let responseAudioData: string | undefined;
    let responseMimeType: string | undefined;
    try {
      const audio = await this.geminiLiveService.getGeminiTtsAudio(
        text,
        targetLanguage,
        geminiApiKey,
      );
      if (audio) {
        responseAudioData = audio.audioData;
        responseMimeType = audio.mimeType;
      }
    } catch (error) {
      console.error('Failed to generate audio for response:', error);
    }
    return { text, audioData: responseAudioData, mimeType: responseMimeType, sessionId };
  }
}
