import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { unzipSync, strFromU8 } from 'fflate';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { prepareTestStorage } from '../common/test-environment';
import { AreasService } from './areas.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { ExportsService } from './exports.service';
import { fingerprintBytes, RevisionsService } from './revisions.service';

describe('F7 — PostgreSQL + MinIO isolados', () => {
  let prisma: PrismaService;
  let storage: StorageService;
  let areas: AreasService;
  let versions: RevisionsService;
  let exports: ExportsService;
  let userId: string;
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS8sAAAAASUVORK5CYII=',
    'base64',
  );
  const create = (nome: string, extra = {}) =>
    prisma.area.create({
      data: {
        userId,
        section: 'LINGUAGENS',
        subSection: 'ESTUDANDO',
        nome,
        categoria: 'F7',
        conteudo: { type: 'doc', content: [] },
        ...extra,
      },
    });

  beforeAll(async () => {
    await prepareTestStorage();
    prisma = new PrismaService();
    await prisma.$connect();
    storage = new StorageService();
    areas = new AreasService(prisma, storage);
    versions = new RevisionsService(prisma, storage);
    exports = new ExportsService(prisma, storage);
    userId = (
      await prisma.user.create({
        data: {
          email: `f7-${randomUUID()}@example.com`,
          passwordHash: 'test-only',
        },
      })
    ).id;
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('CT-026: retém mídia removida, restaura e guarda estado anterior sem mudar estrutura', async () => {
    const parent = await create('Pai');
    const page = await create('日本語', { parentId: parent.id, sortOrder: 7 });
    const attachmentId = randomUUID(),
      key = `${userId}/${page.id}/${attachmentId}`;
    await storage.upload({
      bucket: storage.getBucket(),
      key,
      body: png,
      contentType: 'image/png',
    });
    await prisma.attachment.create({
      data: {
        id: attachmentId,
        areaId: page.id,
        tipo: 'IMAGEM',
        nome: '画像.png',
        url: storage.buildPublicUrlFromKey(key),
      },
    });
    const withMedia = await prisma.area.update({
      where: { id: page.id },
      data: {
        coverAttachmentId: attachmentId,
        conteudo: {
          type: 'doc',
          content: [{ type: 'image', attrs: { attachmentId } }],
        },
      },
    });
    const saved = await versions.create(userId, page.id, {
      name: 'Com imagem',
      updatedAt: withMedia.updatedAt.toISOString(),
    });
    const edited = await areas.update(userId, page.id, {
      nome: 'Atual',
      conteudo: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Texto novo' }],
          },
        ],
      },
      coverAttachmentId: null,
      updatedAt: withMedia.updatedAt.toISOString(),
    });
    await new AttachmentsService(prisma, storage).remove(userId, attachmentId);
    const restored = await versions.restore(userId, page.id, saved.id, {
      updatedAt: edited.updatedAt.toISOString(),
    });
    expect(restored).toMatchObject({
      id: page.id,
      nome: '日本語',
      parentId: parent.id,
      section: 'LINGUAGENS',
      sortOrder: 7,
    });
    expect(restored.coverAttachmentId).not.toBe(attachmentId);
    const media = await prisma.attachment.findUniqueOrThrow({
      where: { id: restored.coverAttachmentId! },
    });
    expect(
      await storage.readObject(storage.resolveStorageKeyFromUrl(media.url)!),
    ).toEqual(png);
    const backup = (await versions.list(userId, page.id)).find((version) =>
      version.name.startsWith('Antes de restaurar'),
    )!;
    const currentAgain = await versions.restore(userId, page.id, backup.id, {
      updatedAt: restored.updatedAt.toISOString(),
    });
    expect(currentAgain.nome).toBe('Atual');
    expect(JSON.stringify(currentAgain.conteudo)).toContain('Texto novo');
    await expect(
      versions.restore(userId, page.id, saved.id, {
        updatedAt: edited.updatedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(areas.remove(userId, page.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('RN-009: duas escritas e duas restaurações com o mesmo token têm um vencedor', async () => {
    const page = await create('Concorrência');
    const saved = await versions.create(userId, page.id, {
      name: 'Inicial',
      updatedAt: page.updatedAt.toISOString(),
    });
    const writes = await Promise.allSettled(
      ['A', 'B'].map((nome) =>
        areas.update(userId, page.id, {
          nome,
          updatedAt: page.updatedAt.toISOString(),
        }),
      ),
    );
    expect(
      writes.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const current = await prisma.area.findUniqueOrThrow({
      where: { id: page.id },
    });
    const restores = await Promise.allSettled(
      [1, 2].map(() =>
        versions.restore(userId, page.id, saved.id, {
          updatedAt: current.updatedAt.toISOString(),
        }),
      ),
    );
    expect(
      restores.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await prisma.pageRevision.count({ where: { areaId: page.id } }),
    ).toBe(2);
  });

  it('RN-009: writers legados também avançam o token em operações imediatas', async () => {
    const page = await create('Token monotônico');
    const future = new Date(Date.now() + 60_000);
    const first = await prisma.area.update({
      where: { id: page.id },
      data: { updatedAt: future },
    });
    const second = await prisma.area.update({
      where: { id: page.id },
      data: { isFavorite: true },
    });
    expect(second.updatedAt.getTime()).toBeGreaterThan(
      first.updatedAt.getTime(),
    );
    await expect(
      areas.update(userId, page.id, {
        nome: 'Não sobrescrever',
        updatedAt: first.updatedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('CT-025: ZIP offline contém arquivos, hashes, hierarquia, código, tarefas e japonês', async () => {
    const page = await create('Exportação');
    const child = await create('Filha', {
      parentId: page.id,
      conteudo: {
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            attrs: { language: 'js' },
            content: [{ type: 'text', text: 'const a = `日本語`;' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '済み' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'toggleBlock',
            attrs: { open: false, summary: 'Recolhido' },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Conteúdo oculto' }],
              },
            ],
          },
        ],
      },
    });
    const deleted = await create('Lixeira', {
      parentId: page.id,
      deletedAt: new Date(),
    });
    const id = randomUUID(),
      key = `${userId}/${child.id}/${id}`;
    await storage.upload({
      bucket: storage.getBucket(),
      key,
      body: png,
      contentType: 'image/png',
    });
    await prisma.attachment.create({
      data: {
        id,
        areaId: child.id,
        tipo: 'IMAGEM',
        nome: '../../画像.png',
        url: storage.buildPublicUrlFromKey(key),
      },
    });
    const zip = unzipSync(
      await exports.create(userId, { ids: [page.id], includeChildren: true }),
    );
    const manifest = JSON.parse(strFromU8(zip['manifest.json'])) as {
      pages: { id: string; parentId: string | null }[];
      files: { path: string; sha256: string }[];
    };
    expect(manifest.pages).toHaveLength(2);
    expect(manifest.pages.find((item) => item.id === child.id)?.parentId).toBe(
      page.id,
    );
    expect(manifest.pages.some((item) => item.id === deleted.id)).toBe(false);
    for (const file of manifest.files)
      expect(fingerprintBytes(Buffer.from(zip[file.path]))).toBe(file.sha256);
    expect(Buffer.from(zip[`pages/${child.id}/files/${id}.png`])).toEqual(png);
    const md = strFromU8(zip[`pages/${child.id}/page.md`]);
    const json = JSON.parse(strFromU8(zip[`pages/${child.id}/page.json`])) as {
      page: { updatedAt: string };
    };
    expect(json.page.updatedAt).toBe(child.updatedAt.toISOString());
    expect(md).toContain('const a = `日本語`;');
    expect(md).toContain('- [x] 済み');
    expect(md).toContain('Conteúdo oculto');
    expect(md).toContain(`files/${id}.png`);
    expect(Object.keys(zip).some((path) => path.includes('..'))).toBe(false);
    expect(
      Object.values(zip)
        .map((bytes) => strFromU8(bytes))
        .join(''),
    ).not.toContain('X-Amz-');
    const withTrash = unzipSync(
      await exports.create(userId, {
        ids: [page.id],
        includeChildren: true,
        includeTrash: true,
      }),
    );
    expect(withTrash[`pages/${deleted.id}/page.md`]).toBeDefined();
  });

  it('RN-001/007: ownership e documentos desconhecidos não são contornados', async () => {
    const page = await create('Privada', {
      conteudo: {
        type: 'doc',
        content: [{ type: 'futureBlock', payload: 'Preservar' }],
      },
    });
    const saved = await versions.create(userId, page.id, {
      name: 'Desconhecida',
      updatedAt: page.updatedAt.toISOString(),
    });
    await expect(
      versions.preview('outra-conta', page.id, saved.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      exports.create('outra-conta', { ids: [page.id] }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      versions.restore(userId, page.id, saved.id, {
        updatedAt: page.updatedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      areas.update(userId, page.id, {
        updatedAt: page.updatedAt.toISOString(),
        conteudo: { type: 'doc' },
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    const zip = unzipSync(await exports.create(userId, { ids: [page.id] }));
    expect(strFromU8(zip[`pages/${page.id}/page.json`])).toContain(
      'futureBlock',
    );
  });

  it('RN-018: mudança durante captura aborta; falha de storage não entrega pacote', async () => {
    const page = await create('Mutável');
    const id = randomUUID(),
      key = `${userId}/${page.id}/${id}`;
    await storage.upload({
      bucket: storage.getBucket(),
      key,
      body: png,
      contentType: 'image/png',
    });
    await prisma.attachment.create({
      data: {
        id,
        areaId: page.id,
        tipo: 'IMAGEM',
        url: storage.buildPublicUrlFromKey(key),
      },
    });
    const read = storage.readObject.bind(storage);
    const spy = jest
      .spyOn(storage, 'readObject')
      .mockImplementationOnce(async (...args) => {
        const bytes = await read(...args);
        await prisma.area.update({
          where: { id: page.id },
          data: { nome: 'Mudou' },
        });
        return bytes;
      });
    await expect(
      exports.create(userId, { ids: [page.id] }),
    ).rejects.toBeInstanceOf(ConflictException);
    spy.mockRestore();
    await storage.delete({ bucket: storage.getBucket(), key });
    await expect(exports.create(userId, { ids: [page.id] })).rejects.toThrow(
      'Não foi possível ler',
    );
    const fresh = await prisma.area.findUniqueOrThrow({
      where: { id: page.id },
    });
    await expect(
      versions.create(userId, page.id, {
        name: 'Ausente',
        updatedAt: fresh.updatedAt.toISOString(),
      }),
    ).rejects.toThrow('Não foi possível ler');
    expect(
      await prisma.pageRevision.count({ where: { areaId: page.id } }),
    ).toBe(0);
    await prisma.attachment.delete({ where: { id } });
  });

  it('RN-001: uma URL de outro proprietário não autoriza copiar seu objeto', async () => {
    const page = await create('URL cruzada');
    const attachment = await prisma.attachment.create({
      data: {
        areaId: page.id,
        tipo: 'IMAGEM',
        url: storage.buildPublicUrlFromKey(`outra-conta/${page.id}/objeto`),
      },
    });
    await expect(exports.create(userId, { ids: [page.id] })).rejects.toThrow(
      'não pertence',
    );
    await expect(
      versions.create(userId, page.id, {
        name: 'Proibida',
        updatedAt: page.updatedAt.toISOString(),
      }),
    ).rejects.toThrow('não pertence');
    await prisma.attachment.delete({ where: { id: attachment.id } });
  });

  it('RNF-002/007: cópia parcial é compensada sem remover os originais', async () => {
    const page = await create('Falha parcial');
    const sourceKeys: string[] = [];
    for (let index = 0; index < 2; index++) {
      const id = randomUUID(),
        key = `${userId}/${page.id}/${id}`;
      sourceKeys.push(key);
      await storage.upload({
        bucket: storage.getBucket(),
        key,
        body: png,
        contentType: 'image/png',
      });
      await prisma.attachment.create({
        data: {
          id,
          areaId: page.id,
          tipo: 'IMAGEM',
          url: storage.buildPublicUrlFromKey(key),
        },
      });
    }
    const upload = storage.upload.bind(storage);
    const keys: string[] = [];
    const spy = jest
      .spyOn(storage, 'upload')
      .mockImplementation(async (options) => {
        keys.push(options.key);
        if (keys.length === 2) throw new Error('FALHA_UPLOAD');
        await upload(options);
      });
    try {
      await expect(
        versions.create(userId, page.id, {
          name: 'Parcial',
          updatedAt: page.updatedAt.toISOString(),
        }),
      ).rejects.toThrow('FALHA_UPLOAD');
    } finally {
      spy.mockRestore();
    }
    expect(
      await prisma.pageRevision.count({ where: { areaId: page.id } }),
    ).toBe(0);
    for (const key of keys)
      await expect(storage.readObject(key)).rejects.toThrow(
        'Não foi possível ler',
      );
    for (const key of sourceKeys)
      expect(await storage.readObject(key)).toEqual(png);
  });
});
