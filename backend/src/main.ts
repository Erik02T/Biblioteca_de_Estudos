import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';
import helmet from 'helmet';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET é obrigatório. Configure-o em backend/.env.');
  }

  // Rejeita valores de exemplo/placeholder do JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  const isPlaceholder =
    jwtSecret.includes('substitua-por') ||
    jwtSecret.includes('gere-um-segredo') ||
    jwtSecret.includes('altere-isto') ||
    jwtSecret.includes('dev-secret-only-change') ||
    jwtSecret.length < 32;
  if (isPlaceholder) {
    throw new Error(
      'JWT_SECRET está configurado com um valor de exemplo ou muito curto. Gere um segredo real com: openssl rand -base64 32',
    );
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(helmet());

  const configuredOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const localOrigins = ['http://localhost:3000', 'http://localhost:3001'];

  const corsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
      if (!origin || localOrigins.includes(origin) || configuredOrigins.includes(origin) || /^https:\/\/[^/]+\.vercel\.app$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não autorizada pelo CORS'));
    },
  };
  app.enableCors(corsOptions);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Aplicação iniciada na porta ${process.env.PORT ?? 3000}`);

  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, () => {
      void (async () => {
        logger.log(`Recebido ${signal}, encerrando aplicação...`);
        try {
          await app.close();
          logger.log('Aplicação encerrada com sucesso');
          process.exit(0);
        } catch (error) {
          logger.error(
            'Erro ao encerrar a aplicação',
            error instanceof Error ? error.stack : String(error),
          );
          process.exit(1);
        }
      })();
    });
  }
}

void bootstrap();
