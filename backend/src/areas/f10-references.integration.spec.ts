import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { requireTestDatabase } from '../common/test-environment';

describe('F10 — referências por ID e documento misto via HTTP/PostgreSQL', () => {
  let app: INestApplication<App>, prisma: PrismaService;
  let token: string, other: string, ownerId: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    requireTestDatabase();
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<INestApplication<App>>();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    for (const second of [false, true]) {
      const result = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `f10-${randomUUID()}@example.com`,
          password: 'F10-fixture-password-12345',
        })
        .expect(201);
      if (second) other = (result.body as { accessToken: string }).accessToken;
      else token = (result.body as { accessToken: string }).accessToken;
    }
    const identity = await request(app.getHttpServer())
      .get('/auth/me')
      .set(auth())
      .expect(200);
    ownerId = (identity.body as { id: string }).id;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('resolve títulos atuais, sem revelar conta alheia/lixeira; valida limite e IDs', async () => {
    const page = await prisma.area.create({
      data: {
        userId: ownerId,
        nome: 'Destino 日本語',
        categoria: 'F10',
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
      },
    });
    const missing = randomUUID();
    const read = (accessToken = token) =>
      request(app.getHttpServer())
        .get(`/areas/references?ids=${page.id},${missing}`)
        .set('Authorization', `Bearer ${accessToken}`);
    let result = await read().expect(200);
    expect(result.body).toEqual({
      items: [
        {
          id: page.id,
          nome: page.nome,
          icone: null,
          section: 'OUTROS',
          available: true,
        },
        { id: missing, available: false },
      ],
    });
    expect((await read(other).expect(200)).body).toEqual({
      items: [
        { id: page.id, available: false },
        { id: missing, available: false },
      ],
    });
    await prisma.area.update({
      where: { id: page.id },
      data: { nome: 'Renomeado', section: 'PROJETOS' },
    });
    result = await read().expect(200);
    expect((result.body as { items: unknown[] }).items[0]).toMatchObject({
      nome: 'Renomeado',
      section: 'PROJETOS',
    });
    await prisma.area.update({
      where: { id: page.id },
      data: { deletedAt: new Date() },
    });
    expect((await read().expect(200)).body).toEqual({
      items: [
        { id: page.id, available: false },
        { id: missing, available: false },
      ],
    });
    await request(app.getHttpServer())
      .get('/areas/references?ids=invalid')
      .set(auth())
      .expect(400);
    await request(app.getHttpServer())
      .get(
        '/areas/references?ids=' +
          Array.from({ length: 101 }, () => randomUUID()).join(','),
      )
      .set(auth())
      .expect(400);
    await request(app.getHttpServer())
      .get('/areas/references?ids=' + missing)
      .expect(401);
  });

  it('busca paginada alcança destinos além dos primeiros vinte e mantém o contrato antigo', async () => {
    const term = `F10-${randomUUID()}`;
    await prisma.area.createMany({
      data: Array.from({ length: 23 }, (_, index) => ({
        userId: ownerId,
        nome: `${term} ${index}`,
        categoria: 'F10',
        section: 'LINGUAGENS',
        subSection: 'ESTUDANDO',
      })),
    });
    const first = await request(app.getHttpServer())
      .get('/areas/search?q=' + term)
      .set(auth())
      .expect(200);
    const second = await request(app.getHttpServer())
      .get(`/areas/search?q=${term}&page=2&limit=20`)
      .set(auth())
      .expect(200);
    expect((first.body as { items: unknown[] }).items).toHaveLength(20);
    expect((second.body as { items: unknown[] }).items).toHaveLength(3);
    expect((second.body as { pagination: object }).pagination).toMatchObject({
      total: 23,
      page: 2,
    });
    await request(app.getHttpServer())
      .get(`/areas/search?q=${term}&page=0`)
      .set(auth())
      .expect(400);
  });

  it('salva/reabre nós mistos, conserva revisão atômica e não sobrescreve conflito', async () => {
    const create = await request(app.getHttpServer())
      .post('/areas')
      .set(auth())
      .set('Idempotency-Key', randomUUID())
      .send({
        nome: 'Misto F10',
        categoria: 'F10',
        section: 'LINGUAGENS',
        subSection: 'ESTUDANDO',
        conteudo: { type: 'doc', content: [{ type: 'paragraph' }] },
      })
      .expect(201);
    const page = create.body as { id: string; updatedAt: string };
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 6, id: randomUUID() },
          content: [{ type: 'text', text: '日本語' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Ver ' },
            { type: 'pageReference', attrs: { targetPageId: randomUUID() } },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'python' },
          content: [{ type: 'text', text: '  print("日本語")\n' }],
        },
        {
          type: 'callout',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '説明' }] },
          ],
        },
      ],
    };
    await request(app.getHttpServer())
      .patch('/areas/' + page.id)
      .set(auth())
      .send({ updatedAt: page.updatedAt, conteudo: content })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/areas/' + page.id)
      .set(auth())
      .send({
        updatedAt: page.updatedAt,
        conteudo: { type: 'doc', content: [{ type: 'paragraph' }] },
      })
      .expect(409);
    const read = await request(app.getHttpServer())
      .get('/areas/' + page.id)
      .set(auth())
      .expect(200);
    expect((read.body as { conteudo: unknown }).conteudo).toEqual(content);
  });
});
