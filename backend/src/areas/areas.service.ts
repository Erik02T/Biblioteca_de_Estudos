import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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

    if (area.attachments && area.attachments.length > 0) {
      const signedAttachments = await this.storage.signAttachmentUrls(
        area.attachments,
      );
      return { ...area, attachments: signedAttachments };
    }

    return area;
  }

  async update(userId: string, id: string, dto: UpdateAreaDto) {
    const area = await this.findOne(userId, id);
    const { conteudo, updatedAt, ...data } = dto;

    if (updatedAt) {
      const expectedUpdatedAt = new Date(updatedAt);
      const currentUpdatedAt = new Date(area.updatedAt);

      if (expectedUpdatedAt.getTime() !== currentUpdatedAt.getTime()) {
        throw new ConflictException(
          'Este bloco foi atualizado por outro usuário. Recarregue a página e tente novamente.',
        );
      }
    }

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
      await this.storage.deleteByUrl(attachment.url);
    }

    return this.prisma.area.delete({ where: { id } });
  }
}
