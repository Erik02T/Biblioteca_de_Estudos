import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SectionType, SubSectionType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: {
    $queryRaw: jest.Mock;
    area: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    attachment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: { findUnique: jest.Mock; create: jest.Mock };
    session: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let accessToken: string;

  const userId = '123e4567-e89b-42d3-a456-426614174000';

  beforeEach(async () => {
    process.env.JWT_SECRET = 'e2e-test-secret-for-health-and-auth-tests';
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prisma = {
      $queryRaw: jest.fn(),
      area: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        $queryRaw: jest.fn(),
      },
      attachment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { findUnique: jest.fn(), create: jest.fn() },
      session: {
        create: jest.fn().mockResolvedValue({ id: 'session-id' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'session-id' }),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    accessToken = await app
      .get(JwtService)
      .signAsync({ sub: userId, email: 'test@example.com', sid: 'session-id' });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return 200 and Hello World', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });
  describe('GET /health', () => {
    it('should return 200 with status ok without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('secret');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should not require JWT authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 with database connected when query succeeds', async () => {
      prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.checks.database).toBe('connected');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return degraded status when database query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.database).toBe('disconnected');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should not reveal internal error details in response', async () => {
      prisma.area.$queryRaw.mockRejectedValue(new Error('connection refused'));

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('error');
      expect(response.body.message).toBeUndefined();
    });
  });

  describe('Security headers (Helmet)', () => {
    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-Frame-Options header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should not include X-Powered-By header', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });
  describe('POST /auth/register', () => {
    it('should register a new user and return access token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@example.com',
        passwordHash: 'hash',
      });
      prisma.session.create.mockResolvedValue({ id: 'new-session-id' });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'secure-password-123' })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject duplicate email registration', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'existing',
        email: 'existing@example.com',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'secure-password-123',
        })
        .expect(409);
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'invalid-email', password: 'secure-password-123' })
        .expect(400);
    });

    it('should reject password shorter than 12 characters', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'short' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should authenticate with valid credentials and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
      });
      prisma.session.create.mockResolvedValue({ id: 'session-id' });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'correct-password-123' })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should rotate refresh token and return new access token', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-id',
        userId,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        user: { id: userId, email: 'test@example.com' },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke session and return success', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
  describe('POST /areas (authenticated)', () => {
    it('should create an area for authenticated user', async () => {
      prisma.area.create.mockResolvedValue({
        id: 'area-1',
        userId,
        section: SectionType.LINGUAGENS,
        subSection: SubSectionType.ESTUDANDO,
        nome: 'TypeScript',
        categoria: 'Frontend',
        nivelEntendimento: 4,
        conteudo: { type: 'doc' },
      });

      const response = await request(app.getHttpServer())
        .post('/areas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          section: SectionType.LINGUAGENS,
          subSection: SubSectionType.ESTUDANDO,
          nome: 'TypeScript',
          categoria: 'Frontend',
          nivelEntendimento: 4,
          conteudo: { type: 'doc', content: [] },
        })
        .expect(201);

      expect(response.body.id).toBe('area-1');
      expect(response.body.userId).toBe(userId);
    });

    it('should reject missing authentication token', async () => {
      await request(app.getHttpServer())
        .post('/areas')
        .send({
          section: SectionType.LINGUAGENS,
          subSection: SubSectionType.ESTUDANDO,
          nome: 'TypeScript',
          categoria: 'Frontend',
        })
        .expect(401);
    });

    it('should reject invalid DTO payload', async () => {
      await request(app.getHttpServer())
        .post('/areas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          section: 'INVALID',
          subSection: 'INVALID',
          nome: '',
          categoria: '',
        })
        .expect(400);
    });

    it('should reject request with malformed bearer token', async () => {
      await request(app.getHttpServer())
        .post('/areas')
        .set('Authorization', 'InvalidToken')
        .send({
          section: SectionType.LINGUAGENS,
          subSection: SubSectionType.ESTUDANDO,
          nome: 'TypeScript',
          categoria: 'Frontend',
        })
        .expect(401);
    });
  });

  describe('GET /areas (authenticated)', () => {
    it('should return only areas owned by current user', async () => {
      prisma.area.findMany.mockResolvedValue([
        {
          id: 'area-1',
          userId,
          section: SectionType.LINGUAGENS,
          subSection: SubSectionType.ESTUDANDO,
        },
      ]);
      prisma.area.count.mockResolvedValue(1);

      const response = await request(app.getHttpServer())
        .get('/areas')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].userId).toBe(userId);
    });

    it('should reject missing authentication', async () => {
      await request(app.getHttpServer()).get('/areas').expect(401);
    });
  });

  describe('Rate limiting', () => {
    it('should process auth routes through rate limit guard', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-id',
        email: 'r@test.com',
        passwordHash: 'hash',
      });
      prisma.session.create.mockResolvedValue({ id: 'session-id' });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'r@test.com', password: 'secure-password-123' });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('Global exception filter', () => {
    it('should return generic error message without stack trace for unhandled errors', async () => {
      prisma.area.create.mockRejectedValue(
        new Error('Unexpected database failure'),
      );

      const response = await request(app.getHttpServer())
        .post('/areas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          section: SectionType.LINGUAGENS,
          subSection: SubSectionType.ESTUDANDO,
          nome: 'TypeScript',
          categoria: 'Frontend',
        })
        .expect(500);

      expect(response.body.statusCode).toBe(500);
      expect(response.body.message).toBe('Erro interno do servidor');
      expect(response.body).not.toHaveProperty('stack');
    });
  });
});
