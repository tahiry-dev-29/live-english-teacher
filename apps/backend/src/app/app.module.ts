import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataAccessPrismaModule } from "@live-english-teacher/data-access-prisma";

@Module({
  imports: [DataAccessPrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
