import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { requireTestDatabase } from '../common/test-environment';

describe('F8 — criação idempotente HTTP com PostgreSQL real', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let otherToken: string;
  let ownerId: string;
  const input = {
    section: 'OUTROS',
    subSection: 'ESTUDANDO',
    nome: 'Fixture F8 日本語',
    categoria: 'Geral',
    conteudo: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Resposta perdida' }],
        },
      ],
    },
  };
  const start = async () => {
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
  };
  const post = (key: string, body = input, accessToken = token) =>
    request(app.getHttpServer())
      .post('/areas')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', key)
      .send(body);
  beforeAll(async () => {
    requireTestDatabase();
    await start();
    for (const other of [false, true]) {
      const result = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `f8-${randomUUID()}@example.com`,
          password: 'F8-fixture-password-12345',
        })
        .expect(201);
      if (other)
        otherToken = (result.body as { accessToken: string }).accessToken;
      else token = (result.body as { accessToken: string }).accessToken;
    }
    const identity = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    ownerId = (identity.body as { id: string }).id;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('CT-002: resposta perdida, reinício da API e repetição mantêm um ID e a revisão', async () => {
    const key = randomUUID();
    const first = await post(key).expect(201);
    const page = first.body as { id: string; updatedAt: string };
    await app.close();
    await start();
    const retried = await post(key).expect(201);
    expect(retried.body).toMatchObject(page);
    expect(
      await prisma.area.count({ where: { userId: ownerId, nome: input.nome } }),
    ).toBe(1);
    expect(
      await prisma.areaCreationRequest.count({
        where: { userId: ownerId, key },
      }),
    ).toBe(1);
  });
  it('serializa tentativas paralelas e isola a mesma chave entre contas', async () => {
    const key = randomUUID();
    const [a, b] = await Promise.all([post(key), post(key)]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect((a.body as { id: string }).id).toBe((b.body as { id: string }).id);
    const other = await post(key, input, otherToken).expect(201);
    expect((other.body as { id: string }).id).not.toBe(
      (a.body as { id: string }).id,
    );
    await request(app.getHttpServer())
      .get(`/areas/${(a.body as { id: string }).id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });
  it('não reaplica o pedido sobre edição remota e rejeita chave com outro payload', async () => {
    const key = randomUUID();
    const first = await post(key).expect(201);
    const page = first.body as { id: string; updatedAt: string };
    const edited = await request(app.getHttpServer())
      .patch(`/areas/${page.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Remoto mais novo', updatedAt: page.updatedAt })
      .expect(200);
    const retried = await post(key).expect(201);
    expect(retried.body).toMatchObject({
      nome: 'Remoto mais novo',
      updatedAt: (edited.body as { updatedAt: string }).updatedAt,
    });
    await post(key, { ...input, nome: 'Outro pedido' }).expect(409);
  });
  it('não recria página na lixeira ou purgada; valida header e identidade', async () => {
    const key = randomUUID();
    const first = await post(key).expect(201);
    const id = (first.body as { id: string }).id;
    await request(app.getHttpServer())
      .delete(`/areas/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await post(key).expect(409);
    await prisma.area.delete({ where: { id } });
    await post(key).expect(409);
    await post('invalid').expect(400);
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
  it('preserva clientes sem header e a comparação atômica estrita de F7', async () => {
    const first = await request(app.getHttpServer())
      .post('/areas')
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(201);
    const page = first.body as { id: string; updatedAt: string };
    const patch = (nome: string) =>
      request(app.getHttpServer())
        .patch(`/areas/${page.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome, updatedAt: page.updatedAt });
    const results = await Promise.all([patch('A'), patch('B')]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    await request(app.getHttpServer())
      .patch(`/areas/${page.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Sem revisão' })
      .expect(400);
  });
});
