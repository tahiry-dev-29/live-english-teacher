import { Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { combineMessageWithContext } from '../chat-history/chat-context.util';
import { SessionTitleService } from '../chat-history/session-title.service';
import { QuotaExceededError } from '../transcribe/groq-live/groq-live.service';
import { BACKEND_MESSAGES } from '../shared/messages';
import { AiProviderService } from './ai-provider.service';
import {
  StreamChatDto,
  resolveStreamApiKey,
} from './ai-stream-validation.pipe';
import {
  endStream,
  writeQuotaError,
  writeSession,
  writeStreamError,
  writeTitle,
  writeToken,
} from './ai-stream-sse.util';


/** SSE session stream body: session bookkeeping + token relay + AI title. */
export async function processStreamChat(
  deps: {
    aiProviderService: AiProviderService;
    chatHistoryService: ChatHistoryService;
    sessionTitleService: SessionTitleService;
    logger: Logger;
  },
  dto: StreamChatDto,
  res: Response,
  keys: {
    groqApiKey?: string;
    geminiApiKey?: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
    mistralApiKey?: string;
    deepseekApiKey?: string;
    qwenApiKey?: string;
    providerApiKey?: string;
  },
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    let sessionId = dto.sessionId || '';
    const session = sessionId
      ? await deps.chatHistoryService.getSession(sessionId)
      : null;
    const isNewSession = !session;

    if (!session) {
      const created = await deps.chatHistoryService.createSession(
        dto.targetLanguage || 'en',
      );
      sessionId = created.id;
    } else if (
      dto.targetLanguage &&
      session.learningLanguage !== dto.targetLanguage
    ) {
      await deps.chatHistoryService.updateSession(sessionId, {
        learningLanguage: dto.targetLanguage,
      });
    }

    writeSession(res, sessionId);

    const history = dto.history?.length
      ? dto.history
      : await deps.chatHistoryService.getSessionHistory(sessionId);

    if (dto.message) {
      await deps.chatHistoryService.addMessage(sessionId, 'user', dto.message);
    }
    const targetLang =
      dto.targetLanguage || session?.learningLanguage || 'English';

    const activeProvider =
      dto.provider && dto.provider !== 'default'
        ? dto.provider
        : process.env['AI_PROVIDER'] || 'gemini';
    const customApiKey = resolveStreamApiKey(activeProvider, keys);

    let fullText = '';
    // Raw message is stored above; the LLM alone sees message + context.
    const stream = deps.aiProviderService.generateStreamText(
      history,
      combineMessageWithContext(dto.message, dto.context),
      targetLang,
      {
        model: dto.model,
        provider: dto.provider,
        groqApiKey: keys.groqApiKey,
        geminiApiKey: keys.geminiApiKey,
        customApiKey,
      },
    );

    for await (const token of stream) {
      fullText += token;
      writeToken(res, token);
    }

    if (fullText) {
      await deps.chatHistoryService.addMessage(sessionId, 'model', fullText);
    }

    // New chat: AI-written title (ChatGPT-style) from the first message.
    // Awaited before [DONE] so the frontend reload picks it up at once.
    if (isNewSession && dto.message?.trim()) {
      const title = await deps.sessionTitleService.generateAndApply(
        sessionId,
        dto.message,
        {
          model: dto.model,
          provider: dto.provider,
          groqApiKey: keys.groqApiKey,
          geminiApiKey: keys.geminiApiKey,
          customApiKey,
          targetLanguage: targetLang,
        },
      );
      if (title) writeTitle(res, title);
    }
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      deps.logger?.warn?.(
        `Quota exceeded for ${error.provider}, prompting user for own key.`,
      );
      writeQuotaError(res, error.provider);
    } else {
      const errorMsg =
        error instanceof Error ? error.message : BACKEND_MESSAGES.error.unknown;
      deps.logger?.error?.(BACKEND_MESSAGES.template.sseStreamError(errorMsg));
      writeStreamError(res, errorMsg);
    }
  } finally {
    endStream(res);
  }
}

