import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
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

  private async deleteStorageObject(url?: string | null) {
    if (!url) return;

    const key = this.resolveStorageKeyFromUrl(url);
    const bucket = process.env.STORAGE_BUCKET;
    if (!key || !bucket) return;

    const client = this.buildStorageClient();
    if (!client) return;

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  create(userId: string, dto: CreateAreaDto) {
    const { conteudo, ...data } = dto;
    return this.prisma.area.create({
      data: {
        ...data,
        userId,
        conteudo: (conteudo ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  findAll(
    userId: string,
    section?: CreateAreaDto['section'],
    subSection?: CreateAreaDto['subSection'],
    page = 1,
    limit = 20,
  ) {
    const where = { userId, section, subSection };
    return Promise.all([
      this.prisma.area.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.area.count({ where }),
    ]).then(([items, total]) => ({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }));
  }

  async findOne(userId: string, id: string) {
    const area = await this.prisma.area.findFirst({
      where: { id, userId },
      include: { attachments: true },
    });

    if (!area) throw new NotFoundException('Área não encontrada');
    return area;
  }

  async update(userId: string, id: string, dto: UpdateAreaDto) {
    await this.findOne(userId, id);
    const { conteudo, ...data } = dto;
    return this.prisma.area.update({
      where: { id },
      data: {
        ...data,
        ...(conteudo === undefined
          ? {}
          : { conteudo: conteudo as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const area = await this.findOne(userId, id);

    for (const attachment of area.attachments ?? []) {
      await this.deleteStorageObject(attachment.url);
    }

    return this.prisma.area.delete({ where: { id } });
  }
}
