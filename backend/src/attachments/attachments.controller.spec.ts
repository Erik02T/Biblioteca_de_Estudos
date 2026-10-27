import { BadRequestException } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

describe('AttachmentsController', () => {
  let controller: AttachmentsController;
  let service: jest.Mocked<AttachmentsService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      upload: jest.fn(),
    } as unknown as jest.Mocked<AttachmentsService>;

    controller = new AttachmentsController(service);
  });

  it('requires file when calling upload', async () => {
    await expect(
      controller.upload(
        'user-1',
        undefined as unknown as Express.Multer.File,
        'area-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('delegates valid file upload to service and sets Content-Disposition header', async () => {
    const file = {
      buffer: Buffer.from('png content'),
      mimetype: 'image/png',
      originalname: 'imagem.png',
    } as Express.Multer.File;

    const attachmentRecord = {
      id: 'att-1',
      areaId: 'area-1',
      url: 'https://storage.example/att-1',
      nome: 'imagem.png',
      tipo: 'IMAGEM',
    };

    service.upload.mockResolvedValue(attachmentRecord as never);

    const resMock = {
      setHeader: jest.fn(),
    };

    const result = await controller.upload('user-1', file, 'area-1', resMock);

    expect(result).toEqual(attachmentRecord);

    expect(service.upload).toHaveBeenCalledWith('user-1', 'area-1', file);
    expect(resMock.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('inline; filename="imagem.png"'),
    );
  });
});
