import { Module } from '@nestjs/common';
import { DataAccessPrismaModule } from '@live-languages-teacher/data-access-prisma';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { GroqLiveService } from './groq-live/groq-live.service';
import { ElevenLabsService } from './elevenlabs/elevenlabs.service';
import { GroqTranscribeService } from './groq-transcribe/groq-transcribe.service';
import { AiModelsService } from './ai-models.service';
import { AiProviderService } from './ai-provider.service';
import { AiStreamController } from './ai-stream.controller';
import { LiveResolver } from './live.resolver';
import { ChatHistoryService } from './chat-history/chat-history.service';

import { OpenAiCompatService } from './openai-compat.service';

@Module({
  imports: [DataAccessPrismaModule],
  controllers: [AiStreamController],
  providers: [
    GeminiLiveService,
    GroqLiveService,
    ElevenLabsService,
    GroqTranscribeService,
    AiModelsService,
    AiProviderService,
    OpenAiCompatService,
    LiveResolver,
    ChatHistoryService,
  ],
  exports: [
    GeminiLiveService,
    GroqLiveService,
    ElevenLabsService,
    GroqTranscribeService,
    AiModelsService,
    AiProviderService,
    OpenAiCompatService,
    ChatHistoryService,
  ],
})
export class FeatureLiveModule {}
