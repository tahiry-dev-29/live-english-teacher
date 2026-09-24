import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from '../ai-chat/ai-provider.service';
import { ChatHistoryService } from './chat-history.service';
import {
  buildTitlePrompt,
  fallbackTitle,
  sanitizeTitle,
} from './session-title.util';

export interface TitleAiOptions {
  model?: string;
  provider?: string;
  groqApiKey?: string;
  geminiApiKey?: string;
  customApiKey?: string;
  targetLanguage?: string;
}

/**
 * Generates a ChatGPT-style title for a new session with the active AI
 * provider, then persists it. Never throws — falls back to the truncated
 * message title already stored by ChatHistoryService.addMessage.
 */
@Injectable()
export class SessionTitleService {
  private readonly logger = new Logger(SessionTitleService.name);

  constructor(
    private readonly aiProviderService: AiProviderService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  async generateAndApply(
    sessionId: string,
    message: string,
    options: TitleAiOptions = {},
  ): Promise<string | null> {
    const source = message?.trim();
    if (!source) return null;
    try {
      const raw = await this.aiProviderService.generateText(
        [],
        buildTitlePrompt(source),
        {
          model: options.model,
          provider: options.provider,
          groqApiKey: options.groqApiKey,
          geminiApiKey: options.geminiApiKey,
          customApiKey: options.customApiKey,
          targetLanguage: options.targetLanguage,
        },
      );
      const title = sanitizeTitle(raw, fallbackTitle(source));
      await this.chatHistoryService.updateSession(sessionId, { title });
      return title;
    } catch (error) {
      this.logger.warn(
        `AI title generation failed for session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }
}
