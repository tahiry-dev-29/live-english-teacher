import { Module, forwardRef } from '@nestjs/common';
import { TranscribeModule } from '../transcribe/transcribe.module';
import { TtsModule } from '../tts/tts.module';
import { AiModelsModule } from '../ai-models/ai-models.module';
import { ChatHistoryModule } from '../chat-history/chat-history.module';
import { AiStreamController } from './ai-stream.controller';
import { AiMediaController } from './ai-media.controller';
import { AiProviderService } from './ai-provider.service';
import { OpenAiCompatService } from './openai-compat.service';
import { LiveChatService } from './live-chat.service';
import { LiveResolver } from './live.resolver';

@Module({
  imports: [
    TranscribeModule,
    TtsModule,
    AiModelsModule,
    forwardRef(() => ChatHistoryModule),
  ],
  controllers: [AiStreamController, AiMediaController],
  providers: [
    AiProviderService,
    OpenAiCompatService,
    LiveChatService,
    LiveResolver,
  ],
  exports: [AiProviderService, OpenAiCompatService, LiveChatService],
})
export class AiChatModule {}
