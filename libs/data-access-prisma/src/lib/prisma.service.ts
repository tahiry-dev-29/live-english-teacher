import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error('╔══════════════════════════════════════════════╗');
      this.logger.error('║  DATABASE CONNECTION FAILED                  ║');
      this.logger.error('╠══════════════════════════════════════════════╣');
      this.logger.error(`║  ${error instanceof Error ? error.message.split('\n')[0] : 'Unknown error'}`);
      this.logger.error('║                                              ║');
      this.logger.error('║  Fix: Start PostgreSQL and check DATABASE_URL║');
      this.logger.error('╚══════════════════════════════════════════════╝');
      throw error;
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
