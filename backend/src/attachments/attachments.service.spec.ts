import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { AttachmentType } from '@prisma/client';
import { AttachmentsService } from './attachments.service';

jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
}));

const mockSend = jest.fn();

describe('AttachmentsService', () => {
  const prisma = {
    attachment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    area: {
      findFirst: jest.fn(),
    },
  };
  const service = new AttachmentsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  it('finds an attachment only through an area owned by the user', async () => {
    const attachment = { id: 'attachment-id', areaId: 'area-id' };
    prisma.attachment.findFirst.mockResolvedValue(attachment);

    await expect(service.findOne('user-id', 'attachment-id')).resolves.toBe(
      attachment,
    );
    expect(prisma.attachment.findFirst).toHaveBeenCalledWith({
      where: { id: 'attachment-id', area: { userId: 'user-id' } },
    });
  });

  it('rejects an attachment outside the user scope', async () => {
    prisma.attachment.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne('user-id', 'attachment-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not list attachments from an area owned by another user', async () => {
    prisma.area.findFirst.mockResolvedValue(null);

    await expect(
      service.list('current-user-id', 'another-users-area-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.area.findFirst).toHaveBeenCalledWith({
      where: { id: 'another-users-area-id', userId: 'current-user-id' },
    });
    expect(prisma.attachment.findMany).not.toHaveBeenCalled();
  });

  it('does not update an attachment owned by another user', async () => {
    prisma.attachment.findFirst.mockResolvedValue(null);

    await expect(
      service.update('current-user-id', 'another-users-attachment-id', {
        tipo: AttachmentType.LINK,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.attachment.update).not.toHaveBeenCalled();
  });

  it('does not remove an attachment owned by another user', async () => {
    prisma.attachment.findFirst.mockResolvedValue(null);

    await expect(
      service.remove('current-user-id', 'another-users-attachment-id'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.attachment.delete).not.toHaveBeenCalled();
  });

  it('updates an attachment after validating a new owned area', async () => {
    prisma.attachment.findFirst.mockResolvedValue({ id: 'attachment-id' });
    prisma.area.findFirst.mockResolvedValue({ id: 'new-area-id' });
    const updated = { id: 'attachment-id', areaId: 'new-area-id' };
    prisma.attachment.update.mockResolvedValue(updated);

    await expect(
      service.update('user-id', 'attachment-id', {
        areaId: 'new-area-id',
        tipo: AttachmentType.LINK,
      }),
    ).resolves.toBe(updated);
    expect(prisma.area.findFirst).toHaveBeenCalledWith({
      where: { id: 'new-area-id', userId: 'user-id' },
    });
    expect(prisma.attachment.update).toHaveBeenCalledWith({
      where: { id: 'attachment-id' },
      data: { areaId: 'new-area-id', tipo: AttachmentType.LINK },
    });
  });

  it.each([
    'javascript:alert(1)',
    'ftp://example.com/file.pdf',
    'not-a-url',
    `https://${'a'.repeat(2040)}.com`,
  ])(
    'rejects an invalid URL before creating an attachment: %s',
    async (url) => {
      await expect(
        service.create('user-id', {
          areaId: 'area-id',
          tipo: AttachmentType.LINK,
          url,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.area.findFirst).not.toHaveBeenCalled();
      expect(prisma.attachment.create).not.toHaveBeenCalled();
    },
  );

  it('allows external URLs only for link attachments', async () => {
    await expect(
      service.create('user-id', {
        areaId: 'area-id',
        tipo: AttachmentType.IMAGEM,
        url: 'https://example.com/not-an-uploaded-image',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.area.findFirst).not.toHaveBeenCalled();
    expect(prisma.attachment.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid URL before updating an attachment', async () => {
    prisma.attachment.findFirst.mockResolvedValue({ id: 'attachment-id' });

    await expect(
      service.update('user-id', 'attachment-id', {
        url: 'javascript:alert(1)',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.attachment.update).not.toHaveBeenCalled();
  });

  it('classifies the file using its detected MIME instead of the declared MIME', async () => {
    prisma.area.findFirst.mockResolvedValue({ id: 'area-id' });
    process.env.STORAGE_BUCKET = 'bucket';
    process.env.STORAGE_PUBLIC_URL = 'https://storage.example';
    process.env.STORAGE_ACCESS_KEY_ID = 'access-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'secret-key';

    const file = {
      buffer: Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489',
        'hex',
      ),
      mimetype: 'application/pdf',
      originalname: 'arquivo.pdf',
    } as Express.Multer.File;

    prisma.attachment.create.mockResolvedValue({
      id: 'attachment-id',
      tipo: AttachmentType.IMAGEM,
      nome: 'arquivo.pdf',
    });

    await expect(service.upload('user-id', 'area-id', file)).resolves.toEqual(
      expect.objectContaining({
        tipo: AttachmentType.IMAGEM,
        nome: 'arquivo.pdf',
      }),
    );
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ ContentType: 'image/png' }),
    );
    expect(prisma.attachment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        areaId: 'area-id',
        tipo: AttachmentType.IMAGEM,
        nome: 'arquivo.pdf',
      }) as never,
    });
  });

  it('removes the uploaded object when attachment creation fails', async () => {
    prisma.area.findFirst.mockResolvedValue({ id: 'area-id' });
    prisma.attachment.create.mockRejectedValue(
      new Error('database unavailable'),
    );
    process.env.STORAGE_BUCKET = 'bucket';
    process.env.STORAGE_PUBLIC_URL = 'https://storage.example';
    process.env.STORAGE_ACCESS_KEY_ID = 'access-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'secret-key';

    const file = {
      buffer: Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489',
        'hex',
      ),
      mimetype: 'image/png',
      originalname: 'imagem.png',
    } as Express.Multer.File;

    await expect(service.upload('user-id', 'area-id', file)).rejects.toThrow(
      'database unavailable',
    );
    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'bucket',
        Key: expect.stringContaining('user-id/area-id/') as never,
      }),
    );
  });

  it('removes the uploaded object when an attachment is deleted', async () => {
    prisma.attachment.findFirst.mockResolvedValue({
      id: 'attachment-id',
      url: 'https://storage.example/user-id/area-id/arquivo.pdf',
    });
    prisma.attachment.delete.mockResolvedValue({
      id: 'attachment-id',
      url: 'https://storage.example/user-id/area-id/arquivo.pdf',
    });
    process.env.STORAGE_BUCKET = 'bucket';
    process.env.STORAGE_PUBLIC_URL = 'https://storage.example';
    process.env.STORAGE_ACCESS_KEY_ID = 'access-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'secret-key';

    await expect(service.remove('user-id', 'attachment-id')).resolves.toEqual(
      expect.objectContaining({ id: 'attachment-id' }),
    );

    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'bucket',
        Key: 'user-id/area-id/arquivo.pdf',
      }),
    );
    expect(prisma.attachment.delete).toHaveBeenCalledWith({
      where: { id: 'attachment-id' },
    });
  });

  it('rejects files whose real MIME cannot be detected', async () => {
    await expect(
      service.upload('user-id', 'area-id', {
        buffer: Buffer.from('texto sem assinatura'),
        mimetype: 'image/png',
        originalname: 'imagem.png',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.area.findFirst).not.toHaveBeenCalled();
  });
});
