import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{
    status: string;
    timestamp: string;
    checks: { database: string };
  }> {
    let database = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch (error) {
      this.logger.error(
        'Falha na verificação de prontidão do banco de dados',
        error instanceof Error ? error.stack : String(error),
      );
      database = 'disconnected';
    }

    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: { database },
    };
  }
}
