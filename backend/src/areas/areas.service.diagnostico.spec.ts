import { AreasService } from './areas.service';
import { requireTestDatabase } from '../common/test-environment';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('Diagnóstico de salvamento (integração com banco real)', () => {
  let realService: AreasService;
  let realPrisma: PrismaService;
  let userId: string;
  const email = `f7-diagnostico-${randomUUID()}@example.com`;

  beforeAll(async () => {
    requireTestDatabase();
    realPrisma = new PrismaService();
    await realPrisma.$connect();

    const existingUser = await realPrisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const created = await realPrisma.user.create({
        data: {
          email,
          passwordHash: 'hash-teste-diagnostico',
        },
      });
      userId = created.id;
    }

    realService = new AreasService(realPrisma, {} as never);
  });

  afterAll(async () => {
    if (!userId) return;
    await realPrisma.area.deleteMany({ where: { userId } });
    await realPrisma.user.delete({ where: { id: userId } });
    await realPrisma.$disconnect();
  });

  it('DIAG-01: deve criar um bloco e salvar conteúdo (simula fluxo do frontend)', async () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Teste de conteúdo do bloco' }],
        },
      ],
    };

    const created = await realService.create(userId, {
      section: 'LINGUAGENS',
      subSection: 'ESTUDANDO',
      nome: 'Bloco Diagnóstico',
      categoria: 'Geral',
      nivelEntendimento: 0,
      icone: '✦',
      conteudo: content,
    });

    expect(created.id).toBeDefined();
    expect(created.nome).toBe('Bloco Diagnóstico');
    expect(created.conteudo).toEqual(content);
    expect(created.updatedAt).toBeDefined();

    const areaId = created.id;
    const updatedAtAfterCreate = created.updatedAt.toISOString();

    const updatedContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Conteúdo atualizado após edição' }],
        },
      ],
    };

    const updated = await realService.update(userId, areaId, {
      conteudo: updatedContent,
      updatedAt: updatedAtAfterCreate,
      section: 'LINGUAGENS',
      subSection: 'ESTUDANDO',
      nome: 'Bloco Diagnóstico',
      categoria: 'Geral',
      nivelEntendimento: 0,
      icone: '✦',
    });

    expect(updated.id).toBe(areaId);
    expect(updated.conteudo).toEqual(updatedContent);
    expect(updated.updatedAt).not.toBe(updatedAtAfterCreate);

    const persisted = await realPrisma.area.findUnique({
      where: { id: areaId },
    });
    expect(persisted).not.toBeNull();
    expect(persisted!.conteudo).toEqual(updatedContent);
  });

  it('DIAG-02: deve falhar se updatedAt não corresponder (conflito otimista)', async () => {
    const content = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Conflito' }] },
      ],
    };

    const created = await realService.create(userId, {
      section: 'LINGUAGENS',
      subSection: 'ESTUDANDO',
      nome: 'Bloco Conflito',
      categoria: 'Geral',
      nivelEntendimento: 0,
      icone: '✦',
      conteudo: content,
    });

    await expect(
      realService.update(userId, created.id, {
        conteudo: content,
        updatedAt: '2020-01-01T00:00:00.000Z',
        section: 'LINGUAGENS',
        subSection: 'ESTUDANDO',
        nome: 'Bloco Conflito',
        categoria: 'Geral',
        nivelEntendimento: 0,
        icone: '✦',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
