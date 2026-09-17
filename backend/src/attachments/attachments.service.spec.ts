import { NotFoundException } from '@nestjs/common';
import { AttachmentType } from '@prisma/client';
import { AttachmentsService } from './attachments.service';

describe('AttachmentsService', () => {
  const prisma = {
    attachment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    area: {
      findFirst: jest.fn(),
    },
  };
  const service = new AttachmentsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
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
});
