import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { prepareTestStorage } from '../common/test-environment';
import { AreasService } from './areas.service';

describe('F12 — duplicação de ramos com referências e mídia reais', () => {
  let prisma: PrismaService;
  let storage: StorageService;
  let areas: AreasService;
  let owner: string;
  let token: string;
  let app: INestApplication;

  beforeAll(async () => {
    await prepareTestStorage();
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    storage = app.get(StorageService);
    areas = app.get(AreasService);
    const auth = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `f12-${randomUUID()}@example.com`,
        password: 'F12-integration-password-12345',
      })
      .expect(201);
    token = (auth.body as { accessToken: string }).accessToken;
    const identity = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    owner = (identity.body as { id: string }).id;
  });
  afterAll(async () => {
    await app?.close();
  });
  afterEach(() => jest.restoreAllMocks());

  const create = (nome: string, parentId?: string) =>
    prisma.area.create({
      data: {
        userId: owner,
        nome,
        categoria: 'F12',
        section: 'LINGUAGENS',
        subSection: 'ESTUDANDO',
        parentId,
        conteudo: { type: 'doc', content: [{ type: 'paragraph' }] },
      },
    });

  it('CT-019: referência de propriedade para filha duplicada respeita a FK', async () => {
    const root = await create('Raiz com referência');
    const child = await create('Filha referenciada', root.id);
    await prisma.area.update({
      where: { id: root.id },
      data: { targetPageId: child.id },
    });
    const copy = await areas.duplicate(owner, root.id, {
      includeChildren: true,
    });
    const copiedChild = await prisma.area.findFirstOrThrow({
      where: { parentId: copy.id },
    });
    expect(copy.targetPageId).toBe(copiedChild.id);
    expect(copiedChild.id).not.toBe(child.id);
  });

  it('CT-019: referência inline legada e mídia são independentes após purge da origem', async () => {
    const root = await create('Raiz com mídia');
    const child = await create('Filha do ramo', root.id);
    const attachmentId = randomUUID();
    const key = `${owner}/${root.id}/${attachmentId}.txt`;
    const bytes = Buffer.from('F12 日本語\n    código\n');
    await storage.upload({
      bucket: storage.getBucket(),
      key,
      body: bytes,
      contentType: 'text/plain',
    });
    await prisma.attachment.create({
      data: {
        id: attachmentId,
        areaId: root.id,
        tipo: 'ARQUIVO',
        url: storage.buildPublicUrlFromKey(key),
      },
    });
    await prisma.area.update({
      where: { id: root.id },
      data: {
        conteudo: {
          type: 'doc',
          content: [
            { type: 'pageReference', attrs: { pageId: child.id } },
            { type: 'attachment', attrs: { attachmentId } },
          ],
        },
      },
    });
    const copy = await areas.duplicate(owner, root.id, {
      includeChildren: true,
    });
    const copiedChild = await prisma.area.findFirstOrThrow({
      where: { parentId: copy.id },
    });
    const content = copy.conteudo as {
      content: { attrs: Record<string, string> }[];
    };
    expect(content.content[0].attrs.pageId).toBe(copiedChild.id);
    const media = await prisma.attachment.findFirstOrThrow({
      where: { areaId: copy.id },
    });
    expect(media.id).not.toBe(attachmentId);
    expect(media.url).not.toBe(storage.buildPublicUrlFromKey(key));
    expect(content.content[1].attrs.attachmentId).toBe(media.id);
    await areas.trash(owner, root.id);
    const trashed = await prisma.area.findUniqueOrThrow({
      where: { id: root.id },
    });
    await request(app.getHttpServer())
      .delete(`/areas/${root.id}/purge`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmed: true, updatedAt: trashed.updatedAt.toISOString() })
      .expect(200);
    const copiedKey = storage.resolveStorageKeyFromUrl(media.url)!;
    expect(await storage.readObject(copiedKey)).toEqual(bytes);
    expect((await areas.findOne(owner, copiedChild.id)).parentId).toBe(copy.id);
  });

  it('CT-017: purge exige confirmação, lixeira, revisão atual e propriedade', async () => {
    const page = await create('Purge protegido');
    const purge = (id: string, body: object) =>
      request(app.getHttpServer())
        .delete(`/areas/${id}/purge`)
        .set('Authorization', `Bearer ${token}`)
        .send(body);
    await purge(page.id, {
      confirmed: true,
      updatedAt: page.updatedAt.toISOString(),
    }).expect(409);
    await areas.trash(owner, page.id);
    const trashed = await prisma.area.findUniqueOrThrow({
      where: { id: page.id },
    });
    await purge(page.id, { updatedAt: trashed.updatedAt.toISOString() }).expect(
      400,
    );
    await purge(page.id, {
      confirmed: true,
      updatedAt: page.updatedAt.toISOString(),
    }).expect(409);
    await purge(randomUUID(), {
      confirmed: true,
      updatedAt: trashed.updatedAt.toISOString(),
    }).expect(404);
    const other = await prisma.user.create({
      data: {
        email: `f12-other-${randomUUID()}@example.com`,
        passwordHash: 'fixture',
      },
    });
    const foreign = await prisma.area.create({
      data: {
        userId: other.id,
        nome: 'Outra conta',
        categoria: 'F12',
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
        deletedAt: new Date(),
      },
    });
    await purge(foreign.id, {
      confirmed: true,
      updatedAt: foreign.updatedAt.toISOString(),
    }).expect(404);
    const result = await purge(page.id, {
      confirmed: true,
      updatedAt: trashed.updatedAt.toISOString(),
    }).expect(200);
    expect(result.body).toEqual({ purgedIds: [page.id] });
    expect(
      await prisma.area.findUnique({ where: { id: foreign.id } }),
    ).not.toBeNull();
  });

  it('CT-017: falha de storage mantém ramo na lixeira e permite repetir limpeza', async () => {
    const page = await create('Falha de limpeza');
    const child = await create('Filha excluída anteriormente', page.id);
    await areas.trash(owner, child.id);
    const attachmentId = randomUUID();
    const key = `${owner}/${page.id}/${attachmentId}.txt`;
    await storage.upload({
      bucket: storage.getBucket(),
      key,
      body: Buffer.from('F12 purge'),
      contentType: 'text/plain',
    });
    await prisma.attachment.create({
      data: {
        id: attachmentId,
        areaId: page.id,
        tipo: 'ARQUIVO',
        url: storage.buildPublicUrlFromKey(key),
      },
    });
    await areas.trash(owner, page.id);
    const trashed = await prisma.area.findUniqueOrThrow({
      where: { id: page.id },
    });
    const body = {
      confirmed: true,
      updatedAt: trashed.updatedAt.toISOString(),
    };
    const secondId = randomUUID();
    const secondKey = `${owner}/${page.id}/${secondId}.txt`;
    await storage.upload({
      bucket: storage.getBucket(),
      key: secondKey,
      body: Buffer.from('F12 segunda mídia'),
      contentType: 'text/plain',
    });
    await prisma.attachment.create({
      data: {
        id: secondId,
        areaId: page.id,
        tipo: 'ARQUIVO',
        url: storage.buildPublicUrlFromKey(secondKey),
      },
    });
    const originalDelete = storage.deleteByUrl.bind(storage);
    let deletions = 0;
    const failure = jest
      .spyOn(storage, 'deleteByUrl')
      .mockImplementation(async (url) => {
        if (++deletions === 2)
          throw new Error('Indisponibilidade induzida após primeira remoção');
        await originalDelete(url);
      });
    const first = await request(app.getHttpServer())
      .delete(`/areas/${page.id}/purge`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(503);
    expect(first.body).toMatchObject({ code: 'PURGE_STORAGE_CLEANUP_FAILED' });
    expect((first.body as { requestId: string }).requestId).toBe(
      first.headers['x-request-id'],
    );
    expect(
      (await prisma.area.findUniqueOrThrow({ where: { id: page.id } }))
        .deletedAt,
    ).not.toBeNull();
    const surviving = await Promise.all(
      [key, secondKey].map((file) =>
        storage
          .readObject(file)
          .then(() => true)
          .catch(() => false),
      ),
    );
    expect(surviving.filter(Boolean)).toHaveLength(1);
    failure.mockRestore();
    const retry = await request(app.getHttpServer())
      .delete(`/areas/${page.id}/purge`)
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(200);
    expect((retry.body as { purgedIds: string[] }).purgedIds).toEqual(
      expect.arrayContaining([page.id, child.id]),
    );
    expect(
      await prisma.attachment.findUnique({ where: { id: attachmentId } }),
    ).toBeNull();
    await expect(storage.readObject(key)).rejects.toThrow();
    await expect(storage.readObject(secondKey)).rejects.toThrow();
  });

  it('CT-017: versões retidas bloqueiam purge antes de remover arquivos', async () => {
    const page = await create('Versão retida');
    await prisma.pageRevision.create({
      data: {
        areaId: page.id,
        name: 'Preservar',
        sourceUpdatedAt: page.updatedAt,
        document: page.conteudo!,
        metadata: {},
      },
    });
    await areas.trash(owner, page.id);
    const trashed = await prisma.area.findUniqueOrThrow({
      where: { id: page.id },
    });
    const cleanup = jest.spyOn(storage, 'deleteByUrl');
    await request(app.getHttpServer())
      .delete(`/areas/${page.id}/purge`)
      .set('Authorization', `Bearer ${token}`)
      .send({ confirmed: true, updatedAt: trashed.updatedAt.toISOString() })
      .expect(409);
    expect(cleanup).not.toHaveBeenCalled();
    cleanup.mockRestore();
  });
});
