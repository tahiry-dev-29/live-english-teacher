import { Module } from '@nestjs/common';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { LiveResolver } from './live.resolver';
import { LiveGateway } from './live.gateway';

@Module({
  providers: [LiveGateway, GeminiLiveService, LiveResolver],
  exports: [GeminiLiveService],
})
export class FeatureLiveModule {}
