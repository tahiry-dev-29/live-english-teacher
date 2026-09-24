import { Module } from '@nestjs/common';
import { DataAccessPrismaModule } from '@live-languages-teacher/data-access-prisma';
import { TranscribeModule } from './transcribe/transcribe.module';
import { TtsModule } from './tts/tts.module';
import { AiModelsModule } from './ai-models/ai-models.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { ChatHistoryModule } from './chat-history/chat-history.module';
import { UserDataModule } from './user-data/user-data.module';

/**
 * Feature slice assembly (T100): no direct providers — only slice imports.
 * Controllers and providers live in AiChatModule / UserDataModule / etc.
 */
@Module({
  imports: [
    DataAccessPrismaModule,
    TranscribeModule,
    TtsModule,
    AiModelsModule,
    ChatHistoryModule,
    UserDataModule,
    AiChatModule,
  ],
  exports: [
    TranscribeModule,
    TtsModule,
    AiModelsModule,
    ChatHistoryModule,
    UserDataModule,
    AiChatModule,
  ],
})
export class FeatureLiveModule {}
