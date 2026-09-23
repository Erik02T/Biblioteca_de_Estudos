import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
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
import {
  CreateAttachmentDto,
  isValidAttachmentUrl,
} from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildStorageClient() {
    const bucket = process.env.STORAGE_BUCKET;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return new S3Client({
      region: process.env.STORAGE_REGION ?? 'auto',
      endpoint: process.env.STORAGE_ENDPOINT,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private resolveStorageKeyFromUrl(url: string) {
    const publicUrl = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, '');
    if (!publicUrl) return null;
    if (!url.startsWith(`${publicUrl}/`)) return null;

    return decodeURIComponent(url.slice(`${publicUrl}/`.length));
  }

  private async deleteFromStorage(url?: string | null) {
    if (!url) return;

    const key = this.resolveStorageKeyFromUrl(url);
    const bucket = process.env.STORAGE_BUCKET;
    if (!key || !bucket) return;

    const client = this.buildStorageClient();
    if (!client) return;

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async create(userId: string, dto: CreateAttachmentDto) {
    this.validateUrl(dto.url);
    this.validateTypeUrl(dto.tipo, dto.url);

    const area = await this.prisma.area.findFirst({
      where: { id: dto.areaId, userId },
    });
    if (!area) throw new NotFoundException('Área não encontrada');

    return this.prisma.attachment.create({ data: dto });
  }

  async list(userId: string, areaId: string) {
    const area = await this.prisma.area.findFirst({
      where: { id: areaId, userId },
    });
    if (!area) throw new NotFoundException('Área não encontrada');

    return this.prisma.attachment.findMany({
      where: { areaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, area: { userId } },
    });
    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    return attachment;
  }

  async update(userId: string, id: string, dto: UpdateAttachmentDto) {
    const attachment = await this.findOne(userId, id);
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

    return this.prisma.attachment.update({
      where: { id },
      data: dto,
    });
  }

  private validateUrl(url: string) {
    if (!isValidAttachmentUrl(url)) {
      throw new BadRequestException(
        'A URL do anexo deve ser HTTP ou HTTPS e ter um formato válido.',
      );
    }
  }

  private validateTypeUrl(tipo: AttachmentType, url: string) {
    if (tipo === AttachmentType.LINK) return;

    const publicUrl = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, '');
    if (!publicUrl || !url.startsWith(`${publicUrl}/`)) {
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

    const area = await this.prisma.area.findFirst({
      where: { id: areaId, userId },
    });
    if (!area) throw new NotFoundException('Área não encontrada');

    const bucket = process.env.STORAGE_BUCKET;
    const publicUrl = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, '');
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
    if (!bucket || !publicUrl || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'Storage não configurado. Defina STORAGE_BUCKET, STORAGE_PUBLIC_URL, STORAGE_ACCESS_KEY_ID e STORAGE_SECRET_ACCESS_KEY.',
      );
    }

    const key = `${userId}/${areaId}/${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const client = this.buildStorageClient();
    if (!client) {
      throw new InternalServerErrorException(
        'Storage não configurado. Defina STORAGE_BUCKET, STORAGE_PUBLIC_URL, STORAGE_ACCESS_KEY_ID e STORAGE_SECRET_ACCESS_KEY.',
      );
    }

    const url = `${publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: detectedFileType.mime,
        }),
      );
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
      return await this.prisma.attachment.create({ data: attachmentData });
    } catch (error) {
      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key }),
        );
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

    await this.deleteFromStorage(attachment.url);
    return this.prisma.attachment.delete({ where: { id } });
  }
}
