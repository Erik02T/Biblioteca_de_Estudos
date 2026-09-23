import { AreasService } from './areas.service';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NotFoundException } from '@nestjs/common';
import { SectionType, SubSectionType } from '@prisma/client';

jest.mock('@aws-sdk/client-s3', () => ({
  DeleteObjectCommand: jest.fn(),
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn(),
}));

const mockSend = jest.fn();

describe('AreasService', () => {
  const prisma = {
    area: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const service = new AreasService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  it('creates an area scoped to the authenticated user', async () => {
    prisma.area.create.mockResolvedValue({
      id: 'area-id',
      userId: 'user-id',
      section: SectionType.LINGUAGENS,
      subSection: SubSectionType.ESTUDANDO,
      nome: 'TypeScript',
    });

    await expect(
      service.create('user-id', {
        section: SectionType.LINGUAGENS,
        subSection: SubSectionType.ESTUDANDO,
        nome: 'TypeScript',
        categoria: 'Frontend',
        nivelEntendimento: 3,
        conteudo: { type: 'doc', content: [] },
      }),
    ).resolves.toEqual(
      expect.objectContaining({ id: 'area-id', userId: 'user-id' }),
    );

    expect(prisma.area.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        section: SectionType.LINGUAGENS,
        subSection: SubSectionType.ESTUDANDO,
        nome: 'TypeScript',
        categoria: 'Frontend',
        nivelEntendimento: 3,
        userId: 'user-id',
      }) as never,
    });
  });

  it('lists only areas owned by the current user and filtered by section/subsection', async () => {
    prisma.area.findMany.mockResolvedValue([{ id: 'area-id' }]);
    prisma.area.count.mockResolvedValue(21);

    await expect(
      service.findAll(
        'user-id',
        SectionType.LINGUAGENS,
        SubSectionType.ESTUDANDO,
      ),
    ).resolves.toEqual({
      items: [{ id: 'area-id' }],
      pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
    });

    expect(prisma.area.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        section: SectionType.LINGUAGENS,
        subSection: SubSectionType.ESTUDANDO,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 20,
    });
    expect(prisma.area.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        section: SectionType.LINGUAGENS,
        subSection: SubSectionType.ESTUDANDO,
      },
    });
  });

  it('does not list areas owned by another user', async () => {
    prisma.area.findMany.mockResolvedValue([]);
    prisma.area.count.mockResolvedValue(0);

    await expect(
      service.findAll('current-user-id', SectionType.LINGUAGENS),
    ).resolves.toEqual({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    expect(prisma.area.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'current-user-id',
        section: SectionType.LINGUAGENS,
        subSection: undefined,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 20,
    });
    expect(prisma.area.count).toHaveBeenCalledWith({
      where: {
        userId: 'current-user-id',
        section: SectionType.LINGUAGENS,
        subSection: undefined,
      },
    });
  });

  it('returns only the requested page of areas', async () => {
    prisma.area.findMany.mockResolvedValue([{ id: 'area-21' }]);
    prisma.area.count.mockResolvedValue(25);

    await expect(
      service.findAll('user-id', undefined, undefined, 2, 20),
    ).resolves.toEqual({
      items: [{ id: 'area-21' }],
      pagination: { page: 2, limit: 20, total: 25, totalPages: 2 },
    });

    expect(prisma.area.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', section: undefined, subSection: undefined },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: 20,
      take: 20,
    });
  });

  it('updates only the matching owned area', async () => {
    prisma.area.findFirst.mockResolvedValue({
      id: 'area-id',
      userId: 'user-id',
    });
    prisma.area.update.mockResolvedValue({
      id: 'area-id',
      conteudo: { type: 'doc' },
    });

    await expect(
      service.update('user-id', 'area-id', {
        conteudo: { type: 'doc', content: [{ type: 'paragraph' }] },
        nome: 'Novo nome',
      }),
    ).resolves.toEqual({ id: 'area-id', conteudo: { type: 'doc' } });

    expect(prisma.area.findFirst).toHaveBeenCalledWith({
      where: { id: 'area-id', userId: 'user-id' },
      include: { attachments: true },
    });
    expect(prisma.area.update).toHaveBeenCalledWith({
      where: { id: 'area-id' },
      data: {
        nome: 'Novo nome',
        conteudo: { type: 'doc', content: [{ type: 'paragraph' }] },
      },
    });
  });

  it('does not read an area owned by another user', async () => {
    prisma.area.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('current-user-id', 'another-users-area-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.area.findFirst).toHaveBeenCalledWith({
      where: { id: 'another-users-area-id', userId: 'current-user-id' },
      include: { attachments: true },
    });
  });

  it('does not update an area owned by another user', async () => {
    prisma.area.findFirst.mockResolvedValue(null);

    await expect(
      service.update('current-user-id', 'another-users-area-id', {
        nome: 'Alteração indevida',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.area.update).not.toHaveBeenCalled();
  });

  it('does not remove an area owned by another user', async () => {
    prisma.area.findFirst.mockResolvedValue(null);

    await expect(
      service.remove('current-user-id', 'another-users-area-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.area.delete).not.toHaveBeenCalled();
  });

  it('deletes storage objects for uploaded attachments before removing the area', async () => {
    prisma.area.findFirst.mockResolvedValue({
      id: 'area-id',
      userId: 'user-id',
      attachments: [
        {
          id: 'attachment-1',
          url: 'https://storage.example/user-id/area-id/imagem.png',
        },
        { id: 'attachment-2', url: 'https://example.com/external.txt' },
      ],
    });
    prisma.area.delete.mockResolvedValue({ id: 'area-id' });

    process.env.STORAGE_BUCKET = 'bucket';
    process.env.STORAGE_PUBLIC_URL = 'https://storage.example';
    process.env.STORAGE_ACCESS_KEY_ID = 'access-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'secret-key';

    await expect(service.remove('user-id', 'area-id')).resolves.toEqual({
      id: 'area-id',
    });

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'bucket',
      Key: 'user-id/area-id/imagem.png',
    });
    expect(prisma.area.delete).toHaveBeenCalledWith({
      where: { id: 'area-id' },
    });
  });
});
