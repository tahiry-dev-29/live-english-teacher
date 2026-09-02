import {
  Body,
  Controller,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { Response } from 'express';
import { AiProviderService } from './ai-provider.service';
import { ChatHistoryService } from './chat-history/chat-history.service';

class StreamChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsArray()
  history?: { role: 'user' | 'model'; text: string }[];

  @IsOptional()
  @IsString()
  targetLanguage?: string;
}

/**
 * Endpoint SSE : chemin de chat complet avec streaming token par token.
 * POST /api/ai/chat/stream — persiste session et messages, comme la
 * mutation GraphQL `chat`. Consommé côté frontend via fetch + ReadableStream.
 */
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('ai')
export class AiStreamController {
  constructor(
    private readonly aiProviderService: AiProviderService,
    private readonly chatHistoryService: ChatHistoryService
  ) {}

  @Post('chat/stream')
  async stream(
    @Body() dto: StreamChatDto,
    @Res() res: Response
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      let sessionId = dto.sessionId || '';
      const session = sessionId
        ? await this.chatHistoryService.getSession(sessionId)
        : null;

      if (!session) {
        const created = await this.chatHistoryService.createSession(
          dto.targetLanguage
        );
        sessionId = created.id;
      }

      res.write(`data: ${JSON.stringify({ sessionId })}\n\n`);

      const history = dto.history?.length
        ? dto.history
        : await this.chatHistoryService.getSessionHistory(sessionId);

      if (dto.message) {
        await this.chatHistoryService.addMessage(sessionId, 'user', dto.message);
      }

      let fullText = '';
      const stream = this.aiProviderService.generateStreamText(
        history,
        dto.message,
        dto.targetLanguage || 'English'
      );

      for await (const token of stream) {
        fullText += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      if (fullText) {
        await this.chatHistoryService.addMessage(sessionId, 'model', fullText);
      }
    } catch {
      res.write(`data: ${JSON.stringify({ error: true })}\n\n`);
    } finally {
      res.end('data: [DONE]\n\n');
    }
  }
}
