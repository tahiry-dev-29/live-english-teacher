import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
  Headers,
  Logger,
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
import { ElevenLabsService, VoiceInfo } from './elevenlabs/elevenlabs.service';
import { GroqTranscribeService } from './groq-transcribe/groq-transcribe.service';
import { TranscribeDto, GenerateTtsDto } from './dto/transcribe.dto';

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

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

/**
 * Endpoints IA :
 * POST /api/ai/chat/stream — Streaming SSE
 * POST /api/ai/transcribe — STT Whisper
 * POST /api/ai/tts — TTS ElevenLabs
 * GET /api/ai/voices — Liste des voix ElevenLabs
 */
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('ai')
export class AiStreamController {
  private readonly logger = new Logger(AiStreamController.name);

  constructor(
    private readonly aiProviderService: AiProviderService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly elevenLabsService: ElevenLabsService,
    private readonly groqTranscribeService: GroqTranscribeService
  ) {}

  @Get('voices')
  getVoices(): VoiceInfo[] {
    return this.elevenLabsService.getVoices();
  }

  @Post('chat/stream')
  async stream(
    @Body() dto: StreamChatDto,
    @Res() res: Response,
    @Headers('x-groq-api-key') groqApiKey?: string,
    @Headers('x-gemini-api-key') geminiApiKey?: string
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
        await this.chatHistoryService.addMessage(
          sessionId,
          'user',
          dto.message
        );
      }

      let fullText = '';
      const stream = this.aiProviderService.generateStreamText(
        history,
        dto.message,
        dto.targetLanguage || 'English',
        {
          model: dto.model,
          provider: dto.provider as 'groq' | 'gemini' | undefined,
          groqApiKey,
          geminiApiKey,
        }
      );

      for await (const token of stream) {
        fullText += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      if (fullText) {
        await this.chatHistoryService.addMessage(sessionId, 'model', fullText);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.error?.(`SSE stream error: ${errorMsg}`);
      res.write(`data: ${JSON.stringify({ error: true, message: `Error: ${errorMsg}` })}\n\n`);
    } finally {
      res.end('data: [DONE]\n\n');
    }
  }

  @Post('transcribe')
  async transcribe(
    @Body() dto: TranscribeDto
  ): Promise<{ transcript: string }> {
    const transcript = await this.groqTranscribeService.transcribe(
      dto.audioData,
      dto.mimeType,
      dto.language
    );

    if (transcript === null) {
      throw new HttpException(
        'Transcription failed or service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    return { transcript };
  }

  @Post('tts')
  async tts(
    @Body() dto: GenerateTtsDto
  ): Promise<{ audioData: string; mimeType: string }> {
    const audio = await this.elevenLabsService.generateTtsAudio(
      dto.text,
      dto.voiceId
    );

    if (!audio) {
      throw new HttpException(
        'ElevenLabs TTS not available',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    return audio;
  }
}
