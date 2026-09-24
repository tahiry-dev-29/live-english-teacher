import { Module } from '@nestjs/common';
import { GeminiLiveService } from './gemini-live/gemini-live.service';
import { GroqLiveService } from './groq-live/groq-live.service';
import { GroqTranscribeService } from './groq-transcribe/groq-transcribe.service';

@Module({
  providers: [GeminiLiveService, GroqLiveService, GroqTranscribeService],
  exports: [GeminiLiveService, GroqLiveService, GroqTranscribeService],
})
export class TranscribeModule {}
