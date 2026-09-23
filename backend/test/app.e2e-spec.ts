import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SectionType, SubSectionType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: {
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
    process.env.JWT_SECRET = 'e2e-test-secret';
    prisma = {
      area: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
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
    await app.init();
    accessToken = await app.get(JwtService).signAsync({ sub: userId, email: 'test@example.com' });
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/areas (POST) creates an area for the authenticated user', async () => {
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

    expect(response.body).toMatchObject({
      id: 'area-1',
      userId,
      nome: 'TypeScript',
    });
    expect(prisma.area.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        nome: 'TypeScript',
        categoria: 'Frontend',
      }),
    });
  });

  it('/areas (GET) returns only areas owned by the current user', async () => {
    prisma.area.findMany.mockResolvedValue([
      {
        id: 'area-1',
        userId,
        section: SectionType.LINGUAGENS,
        subSection: SubSectionType.ESTUDANDO,
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/areas')
      .query({
        section: SectionType.LINGUAGENS,
        subSection: SubSectionType.ESTUDANDO,
      })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      id: 'area-1',
      userId,
    });
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });

    expect(prisma.area.findMany).toHaveBeenCalledWith({
      where: {
        userId,
        section: SectionType.LINGUAGENS,
        subSection: SubSectionType.ESTUDANDO,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 20,
    });
  });

  it('/areas (POST) rejects missing authentication and invalid DTO payload', async () => {
    await request(app.getHttpServer())
      .post('/areas')
      .send({
        section: 'INVALID',
        subSection: 'INVALID',
        nome: '',
        categoria: '',
      })
      .expect(401);

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

  afterEach(async () => {
    await app.close();
  });
});
