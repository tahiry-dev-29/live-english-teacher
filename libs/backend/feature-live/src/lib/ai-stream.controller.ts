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
import { AiModelsService, DiscoveredAiModel } from './ai-models.service';
import { AiProviderService } from './ai-provider.service';
import { ChatHistoryService } from './chat-history/chat-history.service';
import { GroqTranscribeService } from './groq-transcribe/groq-transcribe.service';
import { TranscribeDto, GenerateTtsDto } from './dto/transcribe.dto';
import { QuotaExceededError } from './groq-live/groq-live.service';
import { TtsProviderService } from './tts/tts-provider.service';
import { TtsVoiceInfo, TtsProviderConfig } from './tts/tts-providers.registry';
import { BACKEND_MESSAGES } from './constants/messages';

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
 * GET /api/ai/models — Modèles découverts dynamiquement
 * POST /api/ai/chat/stream — Streaming SSE
 * POST /api/ai/transcribe — STT Whisper
 * POST /api/ai/tts — TTS multi-providers (ElevenLabs, Azure, Google, Polly, OpenAI, MiniMax)
 * GET /api/ai/voices — Liste des voix par provider
 * GET /api/ai/tts-providers — Liste des providers TTS avec métadonnées/quotas
 */
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('ai')
export class AiStreamController {
  private readonly logger = new Logger(AiStreamController.name);

  constructor(
    private readonly aiModelsService: AiModelsService,
    private readonly aiProviderService: AiProviderService,
    private readonly chatHistoryService: ChatHistoryService,
    private readonly ttsProviderService: TtsProviderService,
    private readonly groqTranscribeService: GroqTranscribeService,
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
    const keys: Record<string, string> = {};
    if (groqApiKey) keys['groq'] = groqApiKey;
    if (geminiApiKey) keys['gemini'] = geminiApiKey;
    if (openaiApiKey) keys['openai'] = openaiApiKey;
    if (anthropicApiKey) keys['anthropic'] = anthropicApiKey;
    if (mistralApiKey) keys['mistral'] = mistralApiKey;
    if (deepseekApiKey) keys['deepseek'] = deepseekApiKey;
    if (qwenApiKey) keys['qwen'] = qwenApiKey;

    const effectiveProvider =
      headerProvider && headerProvider !== 'default'
        ? headerProvider
        : undefined;

    return this.aiModelsService.getModels({
      provider: effectiveProvider,
      keys,
      groqApiKey,
      geminiApiKey,
    });
  }

  @Get('tts-providers')
  getTtsProviders(): TtsProviderConfig[] {
    return this.ttsProviderService.getProviders();
  }

  @Get('tts-models')
  async getTtsModels(
    @Headers('x-provider') provider?: string,
    @Headers('x-tts-provider') ttsProviderHeader?: string,
    @Headers('x-azure-tts-key') azureKey?: string,
    @Headers('x-elevenlabs-api-key') elevenKey?: string,
    @Headers('x-openai-api-key') openaiKey?: string,
    @Headers('x-google-tts-key') googleKey?: string,
    @Headers('x-aws-polly-key') pollyKey?: string,
    @Headers('x-minimax-tts-key') minimaxKey?: string,
    @Headers('x-provider-api-key') providerKey?: string,
  ): Promise<{ id: string; name: string; description?: string }[]> {
    const rawProvider = ttsProviderHeader || provider;
    const activeProvider =
      rawProvider === 'default' ? 'elevenlabs' : rawProvider || 'elevenlabs';
    const keyMap: Record<string, string | undefined> = {
      azure: azureKey,
      elevenlabs: elevenKey,
      openai: openaiKey,
      google: googleKey,
      polly: pollyKey,
      minimax: minimaxKey,
    };
    const apiKey = providerKey || keyMap[activeProvider];
    return this.ttsProviderService.getTtsModels({
      provider: activeProvider,
      apiKey,
    });
  }

  @Get('voices')
  async getVoices(
    @Headers('x-provider') provider?: string,
    @Headers('x-tts-provider') ttsProviderHeader?: string,
    @Headers('x-azure-tts-key') azureKey?: string,
    @Headers('x-elevenlabs-api-key') elevenKey?: string,
    @Headers('x-openai-api-key') openaiKey?: string,
    @Headers('x-google-tts-key') googleKey?: string,
    @Headers('x-aws-polly-key') pollyKey?: string,
    @Headers('x-minimax-tts-key') minimaxKey?: string,
  ): Promise<TtsVoiceInfo[]> {
    const rawProvider = ttsProviderHeader || provider;
    const activeProvider =
      rawProvider === 'default' ? 'elevenlabs' : rawProvider || 'elevenlabs';
    const keyMap: Record<string, string | undefined> = {
      azure: azureKey,
      elevenlabs: elevenKey,
      openai: openaiKey,
      google: googleKey,
      polly: pollyKey,
      minimax: minimaxKey,
    };
    const apiKey = keyMap[activeProvider];
    return this.ttsProviderService.getVoices({
      provider: activeProvider,
      apiKey,
    });
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
          dto.targetLanguage || 'en',
        );
        sessionId = created.id;
      } else if (
        dto.targetLanguage &&
        session.learningLanguage !== dto.targetLanguage
      ) {
        await this.chatHistoryService.updateSession(sessionId, {
          learningLanguage: dto.targetLanguage,
        });
      }

      res.write(`data: ${JSON.stringify({ sessionId })}\n\n`);

      const history = dto.history?.length
        ? dto.history
        : await this.chatHistoryService.getSessionHistory(sessionId);

      if (dto.message) {
        await this.chatHistoryService.addMessage(
          sessionId,
          'user',
          dto.message,
        );
      }

      const targetLang =
        dto.targetLanguage || session?.learningLanguage || 'English';

      const providerKeys: Record<string, string | undefined> = {
        groq: groqApiKey,
        gemini: geminiApiKey,
        openai: openaiApiKey,
        anthropic: anthropicApiKey,
        mistral: mistralApiKey,
        deepseek: deepseekApiKey,
        qwen: qwenApiKey,
      };
      const activeProvider =
        dto.provider && dto.provider !== 'default'
          ? dto.provider
          : process.env['AI_PROVIDER'] || 'gemini';
      const customApiKey = providerApiKey || providerKeys[activeProvider];

      let fullText = '';
      const stream = this.aiProviderService.generateStreamText(
        history,
        dto.message,
        targetLang,
        {
          model: dto.model,
          provider: dto.provider,
          groqApiKey,
          geminiApiKey,
          customApiKey,
        },
      );

      for await (const token of stream) {
        fullText += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }

      if (fullText) {
        await this.chatHistoryService.addMessage(sessionId, 'model', fullText);
      }
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        this.logger?.warn?.(
          `Quota exceeded for ${error.provider}, prompting user for own key.`,
        );
        res.write(
          `data: ${JSON.stringify({
            error: true,
            errorCode: 'QUOTA_EXCEEDED',
            provider: error.provider,
          })}\n\n`,
        );
      } else {
        const errorMsg =
          error instanceof Error
            ? error.message
            : BACKEND_MESSAGES.error.unknown;
        this.logger?.error?.(
          BACKEND_MESSAGES.template.sseStreamError(errorMsg),
        );
        res.write(
          `data: ${JSON.stringify({ error: true, message: errorMsg })}\n\n`,
        );
      }
    } finally {
      res.end('data: [DONE]\n\n');
    }
  }

  @Post('transcribe')
  async transcribe(
    @Body() dto: TranscribeDto,
    @Headers('x-groq-api-key') groqApiKey?: string,
  ): Promise<{ transcript: string }> {
    const transcript = await this.groqTranscribeService.transcribe(
      dto.audioData,
      dto.mimeType,
      dto.language,
      dto.model,
      groqApiKey,
    );

    if (transcript === null) {
      throw new HttpException(
        BACKEND_MESSAGES.error.transcriptionFailed,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { transcript };
  }

  @Post('tts')
  async tts(
    @Body() dto: GenerateTtsDto,
    @Headers('x-provider') headerProvider?: string,
    @Headers('x-tts-provider') headerTtsProvider?: string,
    @Headers('x-azure-tts-key') azureKey?: string,
    @Headers('x-elevenlabs-api-key') elevenKey?: string,
    @Headers('x-openai-api-key') openaiKey?: string,
    @Headers('x-google-tts-key') googleKey?: string,
    @Headers('x-aws-polly-key') pollyKey?: string,
    @Headers('x-minimax-tts-key') minimaxKey?: string,
    @Headers('x-provider-api-key') providerKey?: string,
  ): Promise<{ audioData: string; mimeType: string }> {
    const activeProvider =
      dto.provider || headerTtsProvider || headerProvider || 'elevenlabs';
    const keyMap: Record<string, string | undefined> = {
      azure: azureKey,
      elevenlabs: elevenKey,
      openai: openaiKey,
      google: googleKey,
      polly: pollyKey,
      minimax: minimaxKey,
    };
    const apiKey = providerKey || keyMap[activeProvider];

    const audio = await this.ttsProviderService.synthesize({
      provider: activeProvider,
      voiceId: dto.voiceId,
      modelId: dto.modelId,
      text: dto.text,
      apiKey,
      targetLanguage: dto.targetLanguage,
    });

    if (!audio) {
      throw new HttpException(
        BACKEND_MESSAGES.template.ttsUnavailable(activeProvider),
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return audio;
  }
}
