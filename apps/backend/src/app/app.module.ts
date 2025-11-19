import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataAccessPrismaModule } from "@live-english-teacher/data-access-prisma";
import { LiveModule } from './live/live.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TestApiModule } from './test-api/test-api.module';
import { join } from 'path';

@Module({
  imports: [
    DataAccessPrismaModule, 
    LiveModule,
    TestApiModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
