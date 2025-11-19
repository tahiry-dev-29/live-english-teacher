import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataAccessPrismaModule } from "@live-english-teacher/data-access-prisma";
import { LiveModule } from './live/live.module';

@Module({
  imports: [DataAccessPrismaModule, LiveModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
