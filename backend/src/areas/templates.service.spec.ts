import { Test } from '@nestjs/testing';
import { requireTestDatabase } from '../common/test-environment';
import { randomUUID } from 'node:crypto';
import { TemplatesService } from './templates.service';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { SectionType, SubSectionType, TemplateType } from '@prisma/client';

describe('TemplatesService (integração)', () => {
  let service: TemplatesService;
  let prisma: PrismaService;
  let userId: string;
  let templateId: string;
  const email = `f7-template-${randomUUID()}@example.com`;

  beforeAll(async () => {
    requireTestDatabase();
    const moduleRef = await Test.createTestingModule({
      providers: [TemplatesService, PrismaService, StorageService],
    }).compile();

    service = moduleRef.get(TemplatesService);
    prisma = moduleRef.get(PrismaService);

    let existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      try {
        const created = await prisma.user.create({
          data: {
            email,
            passwordHash: 'hash-teste',
          },
        });
        existingUser = created;
      } catch {
        existingUser = await prisma.user.findUnique({ where: { email } });
      }
    }
    userId = existingUser!.id;
  });

  afterAll(async () => {
    if (!userId) return;
    await prisma.template.deleteMany({ where: { userId } });
    await prisma.area.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('V8-F6-001: deve criar um template (RF-024)', async () => {
    const created = await service.create(userId, {
      name: 'Modelo de Anotação',
      description: 'Modelo para anotações rápidas',
      type: TemplateType.NOTE,
      section: SectionType.LINGUAGENS,
      subSection: SubSectionType.ESTUDANDO,
      content: { texto: 'Conteúdo do modelo' },
    });

    templateId = created.id;
    expect(created.id).toBeDefined();
    expect(created.type).toBe(TemplateType.NOTE);
  });

  it('V8-F6-001: deve aplicar um template criando uma área (RF-024)', async () => {
    const created = await service.apply(userId, templateId, {
      section: SectionType.LINGUAGENS,
      subSection: SubSectionType.ESTUDANDO,
    });

    expect(created.id).toBeDefined();
    expect(created.nome).toBe('Modelo de Anotação');
    expect(created.section).toBe(SectionType.LINGUAGENS);
    expect(created.subSection).toBe(SubSectionType.ESTUDANDO);
    expect(created.conteudo).toEqual({ texto: 'Conteúdo do modelo' });
  });

  it('V8-F6-001: deve listar templates do usuário (RF-024)', async () => {
    const found = await service.findAll(
      userId,
      'NOTE',
      'LINGUAGENS',
      'ESTUDANDO',
    );

    expect(Array.isArray(found)).toBe(true);
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.some((t) => t.id === templateId)).toBe(true);
  });
});
