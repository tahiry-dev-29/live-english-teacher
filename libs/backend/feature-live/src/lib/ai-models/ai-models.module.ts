import { Module } from '@nestjs/common';
import { AiModelsService } from './ai-models.service';

@Module({
  providers: [AiModelsService],
  exports: [AiModelsService],
})
export class AiModelsModule {}
