import { Module } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs/elevenlabs.service';
import { TtsVoicesService } from './tts-voices.service';
import { TtsVendorsService } from './tts-vendors.service';
import { TtsProviderService } from './tts-provider.service';

@Module({
  providers: [
    ElevenLabsService,
    TtsVoicesService,
    TtsVendorsService,
    TtsProviderService,
  ],
  exports: [TtsProviderService],
})
export class TtsModule {}
