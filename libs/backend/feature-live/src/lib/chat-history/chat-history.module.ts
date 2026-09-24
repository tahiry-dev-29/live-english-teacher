import { Module, forwardRef } from '@nestjs/common';
import { DataAccessPrismaModule } from '@live-languages-teacher/data-access-prisma';
import { ChatHistoryService } from './chat-history.service';
import { SessionTitleService } from './session-title.service';
import { AiChatModule } from '../ai-chat/ai-chat.module';

@Module({
  imports: [DataAccessPrismaModule, forwardRef(() => AiChatModule)],
  providers: [ChatHistoryService, SessionTitleService],
  exports: [ChatHistoryService, SessionTitleService],
})
export class ChatHistoryModule {}
