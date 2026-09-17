import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAttachmentDto) {
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
    await this.findOne(userId, id);

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

  async upload(userId: string, areaId: string, file: Express.Multer.File) {
    if (!areaId) {
      throw new BadRequestException(
        'O upload precisa ser associado a uma Area',
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
    const client = new S3Client({
      region: process.env.STORAGE_REGION ?? 'auto',
      endpoint: process.env.STORAGE_ENDPOINT,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
      credentials: { accessKeyId, secretAccessKey },
    });

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível salvar o arquivo no storage.',
      );
    }

    return {
      url: `${publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`,
      nome: file.originalname,
      tipo: file.mimetype.startsWith('image/') ? 'IMAGEM' : 'ARQUIVO',
    };
  }

  async remove(userId: string, id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, area: { userId } },
    });
    if (!attachment) throw new NotFoundException('Anexo não encontrado');

    return this.prisma.attachment.delete({ where: { id } });
  }
}
