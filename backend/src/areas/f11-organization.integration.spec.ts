import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { prepareTestStorage } from '../common/test-environment';
import { TemplatesService } from './templates.service';

type Page = {
  id: string;
  updatedAt: string;
  nome: string;
  subSection: string;
  conteudo: unknown;
  coverAttachmentId: string;
};
describe('F11 — organização HTTP, PostgreSQL e storage reais', () => {
  let app: INestApplication<App>,
    prisma: PrismaService,
    storage: StorageService;
  let token: string, other: string, owner: string, otherOwner: string;
  let root: string,
    source: Page,
    model: string,
    copies: Page[] = [];
  const keys = new Set<string>();
  const auth = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    access = token,
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${access}`);
  const doc = (text: string) => ({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { id: randomUUID() },
        content: [{ type: 'text', text }],
      },
    ],
  });
  beforeAll(async () => {
    await prepareTestStorage();
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
    storage = app.get(StorageService);
    for (const second of [false, true]) {
      const result = await auth('post', '/auth/register')
        .send({
          email: `f11-${randomUUID()}@example.com`,
          password: 'F11-fixtures-password-12345',
        })
        .expect(201);
      const access = (result.body as { accessToken: string }).accessToken;
      const identity = await auth('get', '/auth/me', access).expect(200);
      if (second) {
        other = access;
        otherOwner = (identity.body as { id: string }).id;
      } else {
        token = access;
        owner = (identity.body as { id: string }).id;
      }
    }
    root = randomUUID();
    await prisma.area.create({
      data: {
        id: root,
        userId: owner,
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
        nome: 'Raiz F11',
        categoria: 'Raízes',
      },
    });
    await prisma.area.createMany({
      data: Array.from({ length: 125 }, (_, i) => ({
        id: randomUUID(),
        userId: owner,
        parentId: i % 3 === 0 ? root : null,
        section: 'OUTROS' as const,
        subSection: i % 2 ? ('ESTUDADO' as const) : ('ESTUDANDO' as const),
        nome: `F11 página ${String(i).padStart(3, '0')}`,
        categoria: i % 2 ? 'Categoria B' : 'Categoria A',
        nivelEntendimento: i % 6,
        isFavorite: i % 4 === 0,
        sortOrder: i,
        conteudo: doc('Corpo exclusivo da busca F11 ' + i),
        updatedAt: new Date('2026-11-16T12:00:00Z'),
      })),
    });
    await prisma.area.create({
      data: {
        userId: otherOwner,
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
        nome: 'F11 alheia',
        categoria: 'Categoria A',
        conteudo: doc('Corpo exclusivo da busca F11'),
      },
    });
    await prisma.area.create({
      data: {
        userId: owner,
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
        nome: 'F11 excluída',
        categoria: 'Categoria A',
        deletedAt: new Date(),
      },
    });
  });
  afterAll(async () => {
    if (prisma && owner) {
      const attachments = await prisma.attachment.findMany({
        where: { area: { userId: { in: [owner, otherOwner] } } },
      });
      const files = await prisma.templateFile.findMany({
        where: { template: { userId: owner } },
      });
      for (const file of attachments) {
        const key = storage.resolveStorageKeyFromUrl(file.url);
        if (key) keys.add(key);
      }
      for (const file of files) if (file.storageKey) keys.add(file.storageKey);
      for (const key of keys)
        await storage.delete({ bucket: storage.getBucket(), key });
      await prisma.user.deleteMany({
        where: { id: { in: [owner, otherOwner] } },
      });
    }
    await app?.close();
  });

  it('filtra antes de paginar, combina filtros, mantém desempate e corrige página excedente', async () => {
    const base =
      '/areas?scope=ALL&q=F11&section=OUTROS&orderBy=nome&orderDirection=asc&limit=20';
    const first = await auth('get', base).expect(200);
    const second = await auth('get', base + '&page=2').expect(200);
    const a = first.body as {
      items: Page[];
      pagination: { total: number; totalPages: number };
    };
    const b = second.body as typeof a;
    const reversed = await auth(
      'get',
      '/areas?scope=ALL&orderBy=sortOrder&orderDirection=desc',
    ).expect(200);
    expect(
      (reversed.body as { items: { sortOrder: number }[] }).items[0].sortOrder,
    ).toBe(124);
    expect(a.pagination.total).toBe(126);
    expect(a.pagination.totalPages).toBe(7);
    expect(new Set([...a.items, ...b.items].map((item) => item.id)).size).toBe(
      40,
    );
    const expected = await prisma.area.count({
      where: {
        userId: owner,
        deletedAt: null,
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
        parentId: null,
        isFavorite: true,
        categoria: 'Categoria A',
        nivelEntendimento: { gte: 1, lte: 4 },
      },
    });
    const filtered = await auth(
      'get',
      base.replace('scope=ALL', 'scope=ROOTS') +
        '&subSection=ESTUDANDO&isFavorite=true&categoria=Categoria%20A&minLevel=1&maxLevel=4',
    ).expect(200);
    expect((filtered.body as typeof a).pagination.total).toBe(expected);
    const last = await auth('get', base + '&page=999').expect(200);
    expect(
      (last.body as { pagination: { page: number } }).pagination.page,
    ).toBe(7);
    await auth('get', '/areas?orderBy=userId').expect(400);
    await auth('get', '/areas?minLevel=5&maxLevel=1').expect(400);
    await auth('get', '/areas?isFavorite=invalid').expect(400);
    const nav = await auth(
      'get',
      '/areas/navigation?page=2&limit=100&q=ignorado&scope=ROOTS',
    ).expect(200);
    expect((nav.body as typeof a).items.length).toBe(26);
    expect(
      (nav.body as typeof a).items.some((item) => 'conteudo' in item),
    ).toBe(false);
  });

  it('busca no corpo além dos primeiros 20 e edita propriedades no mesmo ID com CAS', async () => {
    const search = await auth(
      'get',
      '/areas/search?q=Corpo%20exclusivo&page=3&limit=20',
    ).expect(200);
    expect(
      (search.body as { pagination: { total: number } }).pagination.total,
    ).toBe(125);
    const area = await prisma.area.findFirstOrThrow({
      where: { userId: owner, nome: 'F11 página 124' },
    });
    const updated = await auth('patch', '/areas/' + area.id)
      .send({
        updatedAt: area.updatedAt.toISOString(),
        nome: 'Nome sincronizado F11',
        categoria: 'Revisão',
        nivelEntendimento: 5,
        subSection: 'ESTUDADO',
      })
      .expect(200);
    expect((updated.body as Page).id).toBe(area.id);
    await auth('patch', '/areas/' + area.id)
      .send({
        updatedAt: area.updatedAt.toISOString(),
        nome: 'Não sobrescrever',
      })
      .expect(409);
    await auth('get', '/areas/' + area.id, other).expect(404);
    const read = await auth('get', '/areas/' + area.id).expect(200);
    expect(read.body).toMatchObject({
      id: area.id,
      nome: 'Nome sincronizado F11',
      nivelEntendimento: 5,
      subSection: 'ESTUDADO',
    });
  });

  it('abertura real não avança a revisão; favoritos e leituras auxiliares não são visitas', async () => {
    const area = await prisma.area.findUniqueOrThrow({ where: { id: root } });
    await auth('get', '/areas/' + root).expect(200);
    await auth('patch', '/areas/' + root + '/favorite').expect(200);
    expect(await prisma.areaOpening.count({ where: { areaId: root } })).toBe(0);
    const before = await prisma.area.findUniqueOrThrow({ where: { id: root } });
    await auth('post', '/areas/' + root + '/opened').expect(201);
    await auth('post', '/areas/' + root + '/opened').expect(201);
    const after = await prisma.area.findUniqueOrThrow({ where: { id: root } });
    expect(after.updatedAt).toEqual(before.updatedAt);
    const recent = await auth(
      'get',
      '/areas?scope=ALL&recent=true&orderBy=lastOpenedAt',
    ).expect(200);
    expect(
      (recent.body as { items: Page[] }).items.map((item) => item.id),
    ).toEqual([root]);
    await auth('post', '/areas/' + root + '/opened', other).expect(404);
    await auth('patch', '/areas/' + root)
      .send({
        updatedAt: before.updatedAt.toISOString(),
        categoria: 'Sem conflito de abertura',
      })
      .expect(200);
    expect(area.id).toBe(root);
  });

  it('CRUD de visualizações globais, unicidade, isolamento e configurações antigas inválidas', async () => {
    const input = {
      name: 'Global F11',
      layout: 'BOARD',
      scope: 'ALL',
      filters: {
        categoria: 'Categoria A',
        minLevel: 0,
        maxLevel: 5,
        isFavorite: true,
      },
      orderBy: 'nome',
      orderDirection: 'asc',
    };
    const created = await auth('post', '/view-configurations')
      .send(input)
      .expect(201);
    const id = (created.body as { id: string }).id;
    for (const field of [
      'name',
      'layout',
      'scope',
      'filters',
      'orderBy',
      'orderDirection',
    ])
      await auth('patch', '/view-configurations/' + id)
        .send({ [field]: null })
        .expect(400);
    await auth('get', '/view-configurations/' + id, other).expect(404);
    await auth('post', '/view-configurations').send(input).expect(409);
    await auth('patch', '/view-configurations/' + id)
      .send({ name: 'Renomeada', layout: 'TABLE' })
      .expect(200);
    const found = await auth('get', '/view-configurations/' + id).expect(200);
    expect(found.body).toMatchObject({
      name: 'Renomeada',
      layout: 'TABLE',
      section: null,
      subSection: null,
    });
    await auth('patch', '/view-configurations/' + id, other)
      .send({ name: 'Alheia' })
      .expect(404);
    await auth('post', '/view-configurations')
      .send({ ...input, filters: { inesperado: true } })
      .expect(400);
    await prisma.viewConfiguration.update({
      where: { id },
      data: { orderBy: 'campoAntigo' },
    });
    const listing = await auth('get', '/view-configurations').expect(200);
    expect(
      (listing.body as { id: string; configurationError: string }[]).find(
        (row) => row.id === id,
      )?.configurationError,
    ).toBeTruthy();
    await auth('patch', '/view-configurations/' + id)
      .send(input)
      .expect(200);
    await auth('delete', '/view-configurations/' + id).expect(200);
  });

  it('captura modelo com mídia/capa e cria cópias fisicamente independentes e idempotentes', async () => {
    const created = await auth('post', '/areas')
      .send({
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
        nome: 'Origem do modelo F11',
        categoria: 'Estudo',
        nivelEntendimento: 4,
        conteudo: doc('Conteúdo do modelo 日本語'),
      })
      .expect(201);
    source = created.body as Page;
    const attachmentId = randomUUID(),
      key = `${owner}/${source.id}/${attachmentId}`;
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2uS8AAAAASUVORK5CYII=',
      'base64',
    );
    keys.add(key);
    await storage.upload({
      bucket: storage.getBucket(),
      key,
      body: bytes,
      contentType: 'image/png',
    });
    await prisma.attachment.create({
      data: {
        id: attachmentId,
        areaId: source.id,
        tipo: 'IMAGEM',
        nome: 'capa.png',
        url: storage.buildPublicUrlFromKey(key),
      },
    });
    const body = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { id: randomUUID() },
          content: [{ type: 'text', text: 'Modelo 日本語' }],
        },
        { type: 'image', attrs: { id: randomUUID(), attachmentId } },
        {
          type: 'paragraph',
          content: [{ type: 'pageReference', attrs: { targetPageId: root } }],
        },
      ],
    };
    const saved = await auth('patch', '/areas/' + source.id)
      .send({
        updatedAt: source.updatedAt,
        conteudo: body,
        coverAttachmentId: attachmentId,
      })
      .expect(200);
    source = saved.body as Page;
    const captured = await auth('post', '/templates/from-page')
      .send({
        pageId: source.id,
        updatedAt: source.updatedAt,
        name: 'Modelo F11',
        type: 'LECTURE',
      })
      .expect(201);
    model = (captured.body as { id: string }).id;
    const manifest = await prisma.templateFile.findMany({
      where: { templateId: model },
    });
    for (const file of manifest) if (file.storageKey) keys.add(file.storageKey);
    expect(manifest).toHaveLength(1);
    const preview = await auth('get', `/templates/${model}/preview`).expect(
      200,
    );
    expect(
      (preview.body as { files: { url: string }[] }).files[0].url,
    ).toContain('X-Amz-');
    await auth('get', `/templates/${model}/preview`, other).expect(404);
    const destination = {
      section: 'OUTROS',
      subSection: 'ESTUDADO',
      parentId: root,
    };
    const idempotency = randomUUID();
    const [a, replay] = await Promise.all([
      auth('post', `/templates/${model}/apply`)
        .set('Idempotency-Key', idempotency)
        .send(destination),
      auth('post', `/templates/${model}/apply`)
        .set('Idempotency-Key', idempotency)
        .send(destination),
    ]);
    expect(a.status).toBe(201);
    expect(replay.status).toBe(201);
    expect((a.body as Page).id).toBe((replay.body as Page).id);
    const b = await auth('post', `/templates/${model}/apply`)
      .set('Idempotency-Key', randomUUID())
      .send(destination)
      .expect(201);
    copies = [a.body as Page, b.body as Page];
    expect(copies[0].id).not.toBe(copies[1].id);
    const copiedAttachments = await prisma.attachment.findMany({
      where: { areaId: { in: copies.map((copy) => copy.id) } },
    });
    expect(new Set(copiedAttachments.map((file) => file.url)).size).toBe(2);
    expect(new Set(copiedAttachments.map((file) => file.id)).size).toBe(2);
    expect(copies[0].conteudo).not.toEqual(copies[1].conteudo);
    for (const copy of copies) {
      const attachment = copiedAttachments.find(
        (file) => file.areaId === copy.id,
      )!;
      keys.add(storage.resolveStorageKeyFromUrl(attachment.url)!);
      expect(copy.coverAttachmentId).toBe(attachment.id);
      expect(JSON.stringify(copy.conteudo)).toContain(attachment.id);
      expect(JSON.stringify(copy.conteudo)).toContain(root);
      expect(
        await storage.readObject(
          storage.resolveStorageKeyFromUrl(attachment.url)!,
        ),
      ).toEqual(bytes);
    }
    // Deleting the source's actual storage object must not affect either snapshot or copy.
    await storage.delete({ bucket: storage.getBucket(), key });
    await auth('delete', '/areas/' + source.id).expect(200);
    await auth('delete', '/templates/' + model).expect(200);
    for (const copy of copies) {
      await auth('get', '/areas/' + copy.id).expect(200);
      const attachment = copiedAttachments.find(
        (file) => file.areaId === copy.id,
      )!;
      expect(
        await storage.readObject(
          storage.resolveStorageKeyFromUrl(attachment.url)!,
        ),
      ).toEqual(bytes);
    }
    await auth('post', `/templates/${model}/apply`)
      .set('Idempotency-Key', idempotency)
      .send(destination)
      .expect(201);
    await auth('post', `/templates/${model}/apply`)
      .set('Idempotency-Key', idempotency)
      .send({ ...destination, subSection: 'ESTUDANDO' })
      .expect(409);
  });

  it('compensa falhas de cópia sem criar modelo parcial e preserva modelos legados de texto', async () => {
    const sourceRow = await prisma.area.findFirstOrThrow({
      where: {
        userId: owner,
        deletedAt: null,
        nome: { startsWith: 'F11 página' },
      },
    });
    const id = randomUUID(),
      key = `${owner}/${sourceRow.id}/${id}`;
    keys.add(key);
    await storage.upload({
      bucket: storage.getBucket(),
      key,
      body: Buffer.from('arquivo fixture'),
      contentType: 'text/plain',
    });
    await prisma.attachment.create({
      data: {
        id,
        areaId: sourceRow.id,
        tipo: 'ARQUIVO',
        url: storage.buildPublicUrlFromKey(key),
      },
    });
    const copy = jest
      .spyOn(storage, 'upload')
      .mockRejectedValueOnce(new Error('Falha de storage induzida'));
    const cleanup = jest.spyOn(storage, 'delete');
    await expect(
      app.get(TemplatesService).fromPage(owner, {
        pageId: sourceRow.id,
        updatedAt: sourceRow.updatedAt.toISOString(),
        name: 'Falha F11',
        type: 'NOTE',
      }),
    ).rejects.toThrow('Falha de storage');
    expect(cleanup).toHaveBeenCalled();
    expect(
      await prisma.template.count({
        where: { userId: owner, name: 'Falha F11' },
      }),
    ).toBe(0);
    copy.mockRestore();
    cleanup.mockRestore();
    const legacy = await auth('post', '/templates')
      .send({
        name: 'Legado F11',
        type: 'NOTE',
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
        content: { texto: 'Texto antigo preservado' },
      })
      .expect(201);
    const legacyId = (legacy.body as { id: string }).id;
    const applied = await auth('post', `/templates/${legacyId}/apply`)
      .send({ section: 'OUTROS', subSection: 'ESTUDANDO' })
      .expect(201);
    expect((applied.body as Page).conteudo).toEqual({
      texto: 'Texto antigo preservado',
    });
  });

  it('modelo legado com mídia sem manifesto falha explicitamente sem criar uma página incompleta', async () => {
    const legacy = await prisma.template.create({
      data: {
        userId: owner,
        name: 'Mídia legada inválida F11',
        type: 'NOTE',
        section: 'OUTROS',
        subSection: 'ESTUDANDO',
        content: {
          type: 'doc',
          content: [{ type: 'image', attrs: { attachmentId: randomUUID() } }],
        },
      },
    });
    const count = await prisma.area.count({ where: { userId: owner } });
    const failure = await auth('post', `/templates/${legacy.id}/apply`)
      .send({ section: 'OUTROS', subSection: 'ESTUDANDO' })
      .expect(400);
    expect((failure.body as { message: string }).message).toContain('Recrie-o');
    expect(await prisma.area.count({ where: { userId: owner } })).toBe(count);
    expect(
      await prisma.template.findUnique({ where: { id: legacy.id } }),
    ).not.toBeNull();
  });

  it('falha ao excluir mídia mantém manifesto recuperável; repetição limpa só os objetos do modelo', async () => {
    const source = await prisma.area.findFirstOrThrow({
      where: {
        userId: owner,
        deletedAt: null,
        attachments: { some: { tipo: 'ARQUIVO' } },
      },
      include: { attachments: true },
    });
    const captured = await app.get(TemplatesService).fromPage(owner, {
      pageId: source.id,
      updatedAt: source.updatedAt.toISOString(),
      name: 'Exclusão recuperável F11',
      type: 'NOTE',
    });
    const files = await prisma.templateFile.findMany({
      where: { templateId: captured.id },
    });
    for (const file of files) if (file.storageKey) keys.add(file.storageKey);
    const remove = jest
      .spyOn(storage, 'delete')
      .mockRejectedValueOnce(new Error('Falha de limpeza induzida'));
    await expect(
      app.get(TemplatesService).remove(owner, captured.id),
    ).rejects.toThrow('Falha de limpeza');
    remove.mockRestore();
    expect(
      (await prisma.template.findUniqueOrThrow({ where: { id: captured.id } }))
        .deletedAt,
    ).not.toBeNull();
    expect(
      await prisma.templateFile.count({ where: { templateId: captured.id } }),
    ).toBe(files.length);
    await auth('post', `/templates/${captured.id}/apply`)
      .send({ section: 'OUTROS', subSection: 'ESTUDANDO' })
      .expect(404);
    await auth('delete', '/templates/' + captured.id).expect(200);
    expect(await prisma.template.count({ where: { id: captured.id } })).toBe(0);
    const original = source.attachments.find(
      (file) => file.tipo === 'ARQUIVO',
    )!;
    expect(
      (
        await storage.readObject(
          storage.resolveStorageKeyFromUrl(original.url)!,
        )
      ).toString(),
    ).toBe('arquivo fixture');
  });
});
