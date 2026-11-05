import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import 'dotenv/config';
import helmet from 'helmet';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma/prisma.service';
import { isAreaWriteAuthorized } from './common/area-write-preauth';

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
    bodyParser: false,
  });

  const jwt = app.get(JwtService);
  const prisma = app.get(PrismaService);
  const areaJsonParser = json({ limit: '52mb' });

  app.use(
    '/areas',
    (request: Request, response: Response, next: NextFunction) => {
      if (!['POST', 'PATCH'].includes(request.method)) {
        next();
        return;
      }

      void isAreaWriteAuthorized(request, jwt, prisma)
        .then((authorized) => {
          if (authorized) {
            next();
            return;
          }

          response.status(401).json({
            statusCode: 401,
            timestamp: new Date().toISOString(),
            path: request.originalUrl,
            message: 'Unauthorized',
          });
        })
        .catch((error: unknown) => {
          logger.error(
            'Falha ao validar sessão antes de processar o corpo da requisição',
            error instanceof Error ? error.stack : String(error),
          );
          response.status(503).json({
            statusCode: 503,
            timestamp: new Date().toISOString(),
            path: request.originalUrl,
            message: 'Não foi possível verificar a sessão.',
          });
        });
    },
  );

  app.use(
    '/areas',
    (request: Request, response: Response, next: NextFunction) => {
      if (!['POST', 'PATCH'].includes(request.method)) {
        next();
        return;
      }
      areaJsonParser(request, response, next);
    },
  );
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.use(helmet());

  const configuredOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const localOrigins = ['http://localhost:3000', 'http://localhost:3001'];

  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => {
      if (
        !origin ||
        localOrigins.includes(origin) ||
        configuredOrigins.includes(origin) ||
        /^https:\/\/[^/]+\.vercel\.app$/.test(origin)
      ) {
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
          logger.log('Aplicação encerrada com sucesso.');
          process.exit(0);
        } catch (error) {
          logger.error('Erro durante encerramento gracioso:', error);
          process.exit(1);
        }
      })();
    });
  }
}

void bootstrap();
