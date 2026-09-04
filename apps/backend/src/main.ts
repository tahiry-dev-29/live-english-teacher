import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { startFlowServer } from '@genkit-ai/express';
import {
  chatWithMemory,
  streamChat,
} from '@live-languages-teacher/feature-live';

import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;

  // Redirect root to GraphQL docs in local (port 3000)
  if (port == 3000) {
    app.getHttpAdapter().get('/', (req: any, res: any) => {
      res.redirect('/graphql');
    });
  }

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );

  const genkitPort = 3400;
  startFlowServer({
    flows: [chatWithMemory, streamChat],
    port: genkitPort,
  });
  Logger.log(
    `🤖 GenKit Flow Server is running on: http://localhost:${genkitPort}`
  );
}

bootstrap();
