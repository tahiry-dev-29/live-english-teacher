import { Module } from '@nestjs/common';
import { DataAccessPrismaModule } from '@live-languages-teacher/data-access-prisma';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { LiveResolver } from './live.resolver';
import { LiveGateway } from './live.gateway';
import { ChatHistoryService } from './chat-history/chat-history.service';

@Module({
  imports: [DataAccessPrismaModule],
  providers: [LiveGateway, GeminiLiveService, LiveResolver, ChatHistoryService],
  exports: [GeminiLiveService, ChatHistoryService],
})
export class FeatureLiveModule {}
