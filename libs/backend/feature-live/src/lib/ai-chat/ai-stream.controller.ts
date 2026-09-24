import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
  Headers,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  StreamChatDto,
  resolveModelsQuery,
} from './ai-stream-validation.pipe';
import { processStreamChat } from './ai-stream-chat.route';
import { AiModelsService } from '../ai-models/ai-models.service';
import type { DiscoveredAiModel } from '../ai-models/ai-models.service';
import { AiProviderService } from './ai-provider.service';
import { ChatHistoryService } from '../chat-history/chat-history.service';
import { SessionTitleService } from '../chat-history/session-title.service';

/**
 * Chat/model endpoints (task 98 split):
 * GET /api/ai/models — live-discovered models
 * POST /api/ai/chat/stream — SSE streaming (see ai-stream-chat.route)
 * TTS/STT routes live in AiMediaController.
 */
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('ai')
export class AiStreamController {
  private readonly logger = new Logger(AiStreamController.name);

  constructor(
    private readonly aiModelsService: AiModelsService,
    private readonly aiProviderService: AiProviderService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly sessionTitleService: SessionTitleService,
  ) {}

  @Get('models')
  async getModels(
    @Headers('x-groq-api-key') groqApiKey?: string,
    @Headers('x-gemini-api-key') geminiApiKey?: string,
    @Headers('x-openai-api-key') openaiApiKey?: string,
    @Headers('x-anthropic-api-key') anthropicApiKey?: string,
    @Headers('x-mistral-api-key') mistralApiKey?: string,
    @Headers('x-deepseek-api-key') deepseekApiKey?: string,
    @Headers('x-qwen-api-key') qwenApiKey?: string,
    @Headers('x-provider') headerProvider?: string,
  ): Promise<DiscoveredAiModel[]> {
    return this.aiModelsService.getModels(
      resolveModelsQuery({
        groqApiKey,
        geminiApiKey,
        openaiApiKey,
        anthropicApiKey,
        mistralApiKey,
        deepseekApiKey,
        qwenApiKey,
        headerProvider,
      }),
    );
  }

  @Post('chat/stream')
  async stream(
    @Body() dto: StreamChatDto,
    @Res() res: Response,
    @Headers('x-groq-api-key') groqApiKey?: string,
    @Headers('x-gemini-api-key') geminiApiKey?: string,
    @Headers('x-openai-api-key') openaiApiKey?: string,
    @Headers('x-anthropic-api-key') anthropicApiKey?: string,
    @Headers('x-mistral-api-key') mistralApiKey?: string,
    @Headers('x-deepseek-api-key') deepseekApiKey?: string,
    @Headers('x-qwen-api-key') qwenApiKey?: string,
    @Headers('x-provider-api-key') providerApiKey?: string,
  ): Promise<void> {
    return processStreamChat(
      {
        aiProviderService: this.aiProviderService,
        chatHistoryService: this.chatHistoryService,
        sessionTitleService: this.sessionTitleService,
        logger: this.logger,
      },
      dto,
      res,
      {
        groqApiKey,
        geminiApiKey,
        openaiApiKey,
        anthropicApiKey,
        mistralApiKey,
        deepseekApiKey,
        qwenApiKey,
        providerApiKey,
      },
    );
  }
}
