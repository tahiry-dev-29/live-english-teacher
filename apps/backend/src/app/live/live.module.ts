import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { LiveResolver } from './live.resolver';

@Module({
  providers: [LiveGateway, GeminiLiveService, LiveResolver],
  exports: [GeminiLiveService],
})
export class LiveModule {}