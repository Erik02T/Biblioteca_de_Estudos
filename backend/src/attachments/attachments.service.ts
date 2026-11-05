import {
  Logger,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fromBuffer, fromFile } from 'file-type';
import type { Readable } from 'node:stream';
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
  isTextMimeAndExt,
  validateBufferSafety,
  validateDetectedMimeType,
  validateFilePathSafety,
  validateTextBufferSafety,
  validateTextFileSafety,
} from './utils/file-validation.util';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

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
    try {
      return await this.uploadFile(userId, areaId, file);
    } finally {
      if (file.path) await this.removeTemporaryFile(file.path);
    }
  }

  private async uploadFile(
    userId: string,
    areaId: string,
    file: Express.Multer.File,
  ) {
    if (!areaId) {
      throw new BadRequestException(
        'O upload precisa ser associado a uma Area',
      );
    }

    let detectedFileType;
    let getUploadBody: () => Buffer | Readable;
    if (file.path) {
      const filePath = file.path;
      await validateFilePathSafety(filePath);
      detectedFileType = await fromFile(filePath);
      getUploadBody = () => createReadStream(filePath);
    } else if (file.buffer) {
      const buffer = file.buffer;
      validateBufferSafety(buffer);
      detectedFileType = await fromBuffer(buffer);
      getUploadBody = () => buffer;
    } else {
      throw new BadRequestException('Arquivo vazio ou inválido.');
    }

    let resolvedMime: string;
    if (detectedFileType?.mime) {
      resolvedMime = detectedFileType.mime;
    } else if (isTextMimeAndExt(file.mimetype, file.originalname)) {
      if (file.path) {
        await validateTextFileSafety(file.path);
      } else if (file.buffer) {
        validateTextBufferSafety(file.buffer);
      }
      resolvedMime = file.mimetype.toLowerCase().trim();
    } else {
      throw new BadRequestException(
        'Não foi possível validar o tipo MIME real do arquivo.',
      );
    }

    validateDetectedMimeType(resolvedMime);

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
      resolvedMime,
      file.originalname,
    );

    await this.storage.upload({
      bucket: this.storage.getBucket(),
      key,
      body: getUploadBody(),
      contentLength: file.size,
      contentType: resolvedMime,
      contentDisposition,
    });

    const attachmentData = {
      areaId,
      url,
      nome: file.originalname,
      tipo: resolvedMime.startsWith('image/')
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
        this.logger.error(
          'Não foi possível remover o arquivo do storage após falha ao salvar o anexo',
          cleanupError instanceof Error
            ? cleanupError.stack
            : String(cleanupError),
        );
      }
      throw error;
    }
  }

  private async removeTemporaryFile(filePath: string) {
    try {
      await unlink(filePath);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }
      this.logger.warn(
        `Não foi possível remover o arquivo temporário de upload: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
