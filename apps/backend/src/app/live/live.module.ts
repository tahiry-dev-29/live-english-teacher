import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { DataAccessPrismaModule } from '@live-english-teacher/data-access-prisma';

@Module({
  imports: [DataAccessPrismaModule], 
  providers: [LiveGateway, GeminiLiveService],
})
export class LiveModule {}