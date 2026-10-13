import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { fromBuffer } from 'file-type';
import { AttachmentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateAttachmentDto,
  isValidAttachmentUrl,
} from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import {
  getContentDisposition,
  validateDetectedMimeType,
} from './utils/file-validation.util';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(userId: string, dto: CreateAttachmentDto) {
    this.validateUrl(dto.url);
    this.validateTypeUrl(dto.tipo, dto.url);

    const area = await this.prisma.area.findFirst({
      where: { id: dto.areaId, userId },
    });
    if (!area) throw new NotFoundException('Área não encontrada');

    const created = await this.prisma.attachment.create({ data: dto });
    return this.storage.signAttachmentUrl(created);
  }

  async list(userId: string, areaId: string) {
    const area = await this.prisma.area.findFirst({
      where: { id: areaId, userId },
    });
    if (!area) throw new NotFoundException('Área não encontrada');

    const items = await this.prisma.attachment.findMany({
      where: { areaId },
      orderBy: { createdAt: 'desc' },
    });
    return this.storage.signAttachmentUrls(items);
  }

  async findOne(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, area: { userId } },
    });
    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    return this.storage.signAttachmentUrl(attachment);
  }

  async update(userId: string, id: string, dto: UpdateAttachmentDto) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, area: { userId } },
    });
    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    if (dto.url !== undefined) this.validateUrl(dto.url);
    this.validateTypeUrl(
      dto.tipo ?? attachment.tipo,
      dto.url ?? attachment.url,
    );

    if (dto.areaId) {
      const area = await this.prisma.area.findFirst({
        where: { id: dto.areaId, userId },
      });
      if (!area) throw new NotFoundException('Área não encontrada');
    }

    const updated = await this.prisma.attachment.update({
      where: { id },
      data: dto,
    });
    return this.storage.signAttachmentUrl(updated);
  }

  private validateUrl(url: string) {
    if (!isValidAttachmentUrl(url)) {
      throw new BadRequestException(
        'A URL do anexo deve ser HTTP ou HTTPS e ter um formato válido.',
      );
    }
  }

  private validateTypeUrl(tipo: AttachmentType, url?: string | null) {
    if (tipo === AttachmentType.LINK) return;
    if (!url) {
      throw new BadRequestException(
        'IMAGEM e ARQUIVO só podem usar URLs geradas pelo upload.',
      );
    }

    const cleanUrl = url.split('?')[0];
    const publicUrl = this.storage.getPublicUrl();
    if (!publicUrl || !cleanUrl.startsWith(`${publicUrl}/`)) {
      throw new BadRequestException(
        'IMAGEM e ARQUIVO só podem usar URLs geradas pelo upload.',
      );
    }
  }

  async upload(userId: string, areaId: string, file: Express.Multer.File) {
    if (!areaId) {
      throw new BadRequestException(
        'O upload precisa ser associado a uma Area',
      );
    }
    const detectedFileType = await fromBuffer(file.buffer);
    if (!detectedFileType) {
      throw new BadRequestException(
        'Não foi possível validar o tipo MIME real do arquivo.',
      );
    }
    validateDetectedMimeType(detectedFileType.mime);

    const area = await this.prisma.area.findFirst({
      where: { id: areaId, userId },
    });
    if (!area) throw new NotFoundException('Área não encontrada');

    if (!this.storage.isConfigured()) {
      throw new InternalServerErrorException(
        'Storage não configurado. Defina STORAGE_BUCKET, STORAGE_PUBLIC_URL, STORAGE_ACCESS_KEY_ID e STORAGE_SECRET_ACCESS_KEY.',
      );
    }

    const key = `${userId}/${areaId}/${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const url = this.storage.buildPublicUrlFromKey(key);
    const contentDisposition = getContentDisposition(
      detectedFileType.mime,
      file.originalname,
    );

    try {
      await this.storage.upload({
        bucket: this.storage.getBucket(),
        key,
        body: file.buffer,
        contentType: detectedFileType.mime,
        contentDisposition,
      });
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível salvar o arquivo no storage.',
      );
    }

    const attachmentData = {
      areaId,
      url,
      nome: file.originalname,
      tipo: detectedFileType.mime.startsWith('image/')
        ? AttachmentType.IMAGEM
        : AttachmentType.ARQUIVO,
    };

    try {
      const created = await this.prisma.attachment.create({
        data: attachmentData,
      });
      return await this.storage.signAttachmentUrl(created);
    } catch (error) {
      try {
        await this.storage.delete({
          bucket: this.storage.getBucket(),
          key,
        });
      } catch (cleanupError) {
        void cleanupError;
      }
      throw error;
    }
  }

  async remove(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, area: { userId } },
    });
    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    await this.storage.deleteByUrl(attachment.url);
    return this.prisma.attachment.delete({ where: { id } });
  }
}
