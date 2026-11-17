import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { requireTestDatabase } from '../common/test-environment';
import { AreasService } from './areas.service';

describe('F7 — regressão dos bloqueadores de hierarquia e lixeira', () => {
  let prisma: PrismaService;
  let service: AreasService;
  let userId: string;
  const create = (nome: string, extra = {}) =>
    prisma.area.create({
      data: {
        userId,
        nome,
        categoria: 'Fixtures de correção',
        section: 'LINGUAGENS',
        subSection: 'ESTUDANDO',
        conteudo: { texto: '日本語 preservado' },
        ...extra,
      },
    });
  beforeAll(async () => {
    requireTestDatabase();
    prisma = new PrismaService();
    await prisma.$connect();
    service = new AreasService(prisma, new StorageService());
    userId = (
      await prisma.user.create({
        data: {
          email: `f7-correction-${randomUUID()}@example.com`,
          passwordHash: 'test-only',
        },
      })
    ).id;
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('BUG-F7-002: propaga seção em todo o ramo sem mudar IDs, conteúdo, anexos ou estado de estudo', async () => {
    const root = await create('Raiz');
    const child = await create('Filha estudada', {
      parentId: root.id,
      subSection: 'ESTUDADO',
      nivelEntendimento: 4,
    });
    const grandchild = await create('Neta', { parentId: child.id });
    const previousBatch = randomUUID();
    const deleted = await create('Excluída antes', {
      parentId: root.id,
      deletedAt: new Date(),
      deletionBatchId: previousBatch,
    });
    const link = await prisma.attachment.create({
      data: {
        areaId: child.id,
        tipo: 'LINK',
        url: 'https://example.com',
        nome: 'Material',
      },
    });
    await service.update(userId, root.id, {
      section: 'FACULDADE',
      updatedAt: root.updatedAt.toISOString(),
    });
    const branch = await prisma.area.findMany({
      where: { id: { in: [root.id, child.id, grandchild.id, deleted.id] } },
    });
    expect(branch.every((page) => page.section === 'FACULDADE')).toBe(true);
    expect(
      branch.every(
        (page) =>
          JSON.stringify(page.conteudo) === JSON.stringify(root.conteudo),
      ),
    ).toBe(true);
    expect(branch.find((page) => page.id === child.id)).toMatchObject({
      subSection: 'ESTUDADO',
      nivelEntendimento: 4,
    });
    expect(branch.find((page) => page.id === deleted.id)).toMatchObject({
      deletionBatchId: previousBatch,
      deletedAt: deleted.deletedAt,
    });
    expect(
      await prisma.attachment.findUnique({ where: { id: link.id } }),
    ).toMatchObject({ areaId: child.id });
  });

  it('move para outra mãe herdando seção, mantendo status independente; rejeita seção contraditória', async () => {
    const parent = await create('Mãe faculdade estudada', {
      section: 'FACULDADE',
      subSection: 'ESTUDADO',
    });
    const root = await create('Movida');
    const child = await create('Descendente', { parentId: root.id });
    const moved = await service.update(userId, root.id, {
      parentId: parent.id,
      section: 'LINGUAGENS',
      updatedAt: root.updatedAt.toISOString(),
    });
    expect(moved).toMatchObject({
      parentId: parent.id,
      section: 'FACULDADE',
      subSection: 'ESTUDANDO',
    });
    expect(
      (await prisma.area.findUniqueOrThrow({ where: { id: child.id } }))
        .section,
    ).toBe('FACULDADE');
    await expect(
      service.update(userId, root.id, {
        section: 'PROJETOS',
        updatedAt: moved.updatedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const detached = await service.update(userId, root.id, {
      parentId: null,
      section: 'PROJETOS',
      updatedAt: moved.updatedAt.toISOString(),
    });
    expect(detached.parentId).toBeNull();
    expect(
      (await prisma.area.findUniqueOrThrow({ where: { id: child.id } }))
        .section,
    ).toBe('PROJETOS');
  });

  it('falha ao atualizar descendentes reverte também a gravação da raiz', async () => {
    const root = await create('Rollback raiz');
    const child = await create('Rollback filha', { parentId: root.id });
    const failingClient = prisma.$extends({
      query: {
        area: {
          updateMany({ args, query }) {
            if (args.data.section === 'OUTROS')
              throw new Error('FALHA_DESCENDENTES');
            return query(args);
          },
        },
      },
    });
    // The test client keeps real PostgreSQL transactions and injects only this failure.
    const failingService = new AreasService(
      failingClient as unknown as PrismaService,
      new StorageService(),
    );
    await expect(
      failingService.update(userId, root.id, {
        section: 'OUTROS',
        updatedAt: root.updatedAt.toISOString(),
      }),
    ).rejects.toThrow('FALHA_DESCENDENTES');
    expect(
      await prisma.area.findUnique({ where: { id: root.id } }),
    ).toMatchObject({ section: root.section, updatedAt: root.updatedAt });
    expect(
      await prisma.area.findUnique({ where: { id: child.id } }),
    ).toMatchObject({ section: child.section, updatedAt: child.updatedAt });
  });

  it('RN-002: movimentos concorrentes inversos não formam ciclo', async () => {
    const a = await create('A');
    const b = await create('B');
    const results = await Promise.allSettled([
      service.update(userId, a.id, {
        parentId: b.id,
        updatedAt: a.updatedAt.toISOString(),
      }),
      service.update(userId, b.id, {
        parentId: a.id,
        updatedAt: b.updatedAt.toISOString(),
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const pages = await prisma.area.findMany({
      where: { id: { in: [a.id, b.id] } },
    });
    expect(pages.filter((page) => page.parentId === null)).toHaveLength(1);
  });

  it('reordenação usa as mesmas regras de seção e ciclo', async () => {
    const parent = await create('Destino', { section: 'PROJETOS' });
    const root = await create('Origem');
    const child = await create('Filha', { parentId: root.id });
    const moved = await service.reorder(userId, root.id, {
      parentId: parent.id,
    });
    expect(moved).toMatchObject({ section: 'PROJETOS', parentId: parent.id });
    expect(
      (await prisma.area.findUniqueOrThrow({ where: { id: child.id } }))
        .section,
    ).toBe('PROJETOS');
    await expect(
      service.reorder(userId, parent.id, { parentId: child.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('criação herda seção e serializa com trash concorrente sem deixar filha ativa sob pai excluído', async () => {
    const parent = await create('Mãe estudada', {
      section: 'FACULDADE',
      subSection: 'ESTUDADO',
    });
    const child = await service.create(userId, {
      parentId: parent.id,
      nome: 'Filha estudando',
      categoria: 'Teste',
      section: 'LINGUAGENS',
      subSection: 'ESTUDANDO',
    });
    expect(child).toMatchObject({
      section: 'FACULDADE',
      subSection: 'ESTUDANDO',
    });
    const other = await create('Concorrente');
    await Promise.allSettled([
      service.create(userId, {
        parentId: other.id,
        nome: 'Nova filha',
        categoria: 'Teste',
        section: 'LINGUAGENS',
        subSection: 'ESTUDANDO',
      }),
      service.trash(userId, other.id),
    ]);
    expect(
      await prisma.area.count({
        where: { parentId: other.id, deletedAt: null },
      }),
    ).toBe(0);
  });

  it('BUG-F7-003: exclui/restaura o lote inteiro sem ressuscitar exclusões anteriores', async () => {
    const root = await create('Lote');
    const child = await create('Filha', { parentId: root.id });
    const grandchild = await create('Neta', { parentId: child.id });
    const earlier = await create('Excluída separada', { parentId: root.id });
    const first = await service.trash(userId, earlier.id);
    const trashed = await service.trash(userId, root.id);
    expect(trashed.deletionBatchId).not.toBe(first.deletionBatchId);
    for (const id of [child.id, grandchild.id])
      expect(await prisma.area.findUnique({ where: { id } })).toMatchObject({
        deletedAt: trashed.deletedAt,
        deletionBatchId: trashed.deletionBatchId,
      });
    expect((await service.search(userId, 'Lote')).items).toHaveLength(0);
    await expect(service.findOne(userId, child.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const restored = await service.restore(userId, child.id);
    expect(new Set(restored.restoredIds)).toEqual(
      new Set([root.id, child.id, grandchild.id]),
    );
    expect(
      (await prisma.area.findUniqueOrThrow({ where: { id: root.id } }))
        .deletedAt,
    ).toBeNull();
    expect(
      (await prisma.area.findUniqueOrThrow({ where: { id: earlier.id } }))
        .deletionBatchId,
    ).toBe(first.deletionBatchId);
  });

  it('restaura na raiz com aviso quando a mãe continua na lixeira', async () => {
    const parent = await create('Pai');
    const child = await create('Filha', { parentId: parent.id });
    await service.trash(userId, child.id);
    await service.trash(userId, parent.id);
    const restored = await service.restore(userId, child.id);
    expect(restored).toMatchObject({
      parentId: null,
      section: 'LINGUAGENS',
      deletedAt: null,
    });
    expect(restored.warning).toContain('raiz');
    expect(
      (await prisma.area.findUniqueOrThrow({ where: { id: parent.id } }))
        .deletedAt,
    ).not.toBeNull();
  });

  it('lixeira legada sem lote restaura só a página escolhida; conta alheia não modifica nada', async () => {
    const parent = await create('Legado', { deletedAt: new Date() });
    const child = await create('Legado filho', {
      parentId: parent.id,
      deletedAt: new Date(),
    });
    await expect(
      service.restore('outra-conta', parent.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    const restored = await service.restore(userId, parent.id);
    expect(restored.restoredIds).toEqual([parent.id]);
    expect(
      (await prisma.area.findUniqueOrThrow({ where: { id: child.id } }))
        .deletedAt,
    ).not.toBeNull();
  });
});
