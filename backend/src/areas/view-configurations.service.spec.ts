import { Test } from '@nestjs/testing';
import { requireTestDatabase } from '../common/test-environment';
import { randomUUID } from 'node:crypto';
import { ViewConfigurationsService } from './view-configurations.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  SectionType,
  SubSectionType,
  ViewLayout,
  ViewScope,
} from '@prisma/client';

describe('ViewConfigurationsService (integração)', () => {
  let service: ViewConfigurationsService;
  let prisma: PrismaService;
  let userId: string;
  const email = `f7-view-${randomUUID()}@example.com`;

  beforeAll(async () => {
    requireTestDatabase();
    const moduleRef = await Test.createTestingModule({
      providers: [ViewConfigurationsService, PrismaService],
    }).compile();

    service = moduleRef.get(ViewConfigurationsService);
    prisma = moduleRef.get(PrismaService);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash: 'hash-teste',
        },
      });
      userId = created.id;
    }
  });

  afterAll(async () => {
    if (!userId) return;
    await prisma.viewConfiguration.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('V6-F6-001: deve criar uma visualização com layout TABLE (RF-022)', async () => {
    const created = await service.create(userId, {
      name: 'Minha Tabela',
      layout: ViewLayout.TABLE,
      scope: ViewScope.ROOTS,
      section: SectionType.LINGUAGENS,
      subSection: SubSectionType.ESTUDANDO,
      filters: {},
      orderBy: 'updatedAt',
      orderDirection: 'desc',
    });

    expect(created.id).toBeDefined();
    expect(created.layout).toBe(ViewLayout.TABLE);
    expect(created.section).toBe(SectionType.LINGUAGENS);
  });

  it('V6-F6-001: deve buscar visualizações por seção e subseção (RF-022)', async () => {
    const found = await service.findAll(userId, 'LINGUAGENS', 'ESTUDANDO');

    expect(Array.isArray(found)).toBe(true);
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.some((v) => v.layout === ViewLayout.TABLE)).toBe(true);
  });

  it('V7-F6-001: deve salvar e recarregar uma visualização (RF-023)', async () => {
    const created = await service.create(userId, {
      name: 'Visualização Salvada',
      layout: ViewLayout.BOARD,
      scope: ViewScope.ALL,
      section: SectionType.PROJETOS,
      subSection: SubSectionType.ESTUDADO,
      filters: { categoria: 'Estudo' },
      orderBy: 'nome',
      orderDirection: 'asc',
    });

    const reloaded = await service.findOne(userId, created.id);

    expect(reloaded).not.toBeNull();
    if (!reloaded) throw new Error('Visualização não encontrada');
    expect(reloaded.name).toBe('Visualização Salvada');
    expect(reloaded.layout).toBe(ViewLayout.BOARD);
    expect(reloaded.filters).toEqual({ categoria: 'Estudo' });
    expect(reloaded.orderBy).toBe('nome');
    expect(reloaded.orderDirection).toBe('asc');
  });
});
