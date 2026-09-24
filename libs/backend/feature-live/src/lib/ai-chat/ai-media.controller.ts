import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Headers,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GroqTranscribeService } from '../transcribe/groq-transcribe/groq-transcribe.service';
import { TranscribeDto, GenerateTtsDto } from '../shared/dto/transcribe.dto';
import { TtsProviderService } from '../tts/tts-provider.service';
import { TtsVoiceInfo, TtsProviderConfig } from '../tts/tts-providers.registry';
import { BACKEND_MESSAGES } from '../shared/messages';
import {
  resolveTtsApiKey,
  resolveTtsProvider,
} from './ai-stream-tts.util';
import { processTts } from './ai-stream-media.route';

/**
 * Media endpoints (TTS + STT) — split from AiStreamController (task 98).
 * POST /api/ai/transcribe — STT Whisper
 * POST /api/ai/tts — TTS multi-providers
 * GET /api/ai/voices — voices per provider
 * GET /api/ai/tts-models — live TTS models
 * GET /api/ai/tts-providers — providers metadata/quotas
 */
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('ai')
export class AiMediaController {
  constructor(
    private readonly ttsProviderService: TtsProviderService,
    private readonly groqTranscribeService: GroqTranscribeService,
  ) {}

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
    const activeProvider = resolveTtsProvider(provider, ttsProviderHeader);
    const apiKey = resolveTtsApiKey(activeProvider, {
      azureKey,
      elevenKey,
      openaiKey,
      googleKey,
      pollyKey,
      minimaxKey,
      providerKey,
    });
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
    const activeProvider = resolveTtsProvider(provider, ttsProviderHeader);
    const apiKey = resolveTtsApiKey(activeProvider, {
      azureKey,
      elevenKey,
      openaiKey,
      googleKey,
      pollyKey,
      minimaxKey,
    });
    return this.ttsProviderService.getVoices({
      provider: activeProvider,
      apiKey,
    });
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
    return processTts(this.ttsProviderService, dto, {
      headerProvider,
      headerTtsProvider,
      providerKey,
      azureKey,
      elevenKey,
      openaiKey,
      googleKey,
      pollyKey,
      minimaxKey,
    });
  }
}
