import { Module } from '@nestjs/common';
import { TestApiResolver } from './test-api.resolver';

@Module({
  providers: [TestApiResolver],
})
export class TestApiModule {}
