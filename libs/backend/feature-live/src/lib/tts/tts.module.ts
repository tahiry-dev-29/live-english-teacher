import { Module } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs/elevenlabs.service';
import { TtsVoicesService } from './tts-voices.service';
import { TtsSynthesizeService } from './tts-synthesize.service';
import { TtsProviderService } from './tts-provider.service';

@Module({
  providers: [
    ElevenLabsService,
    TtsVoicesService,
    TtsSynthesizeService,
    TtsProviderService,
  ],
  exports: [TtsProviderService],
})
export class TtsModule {}
