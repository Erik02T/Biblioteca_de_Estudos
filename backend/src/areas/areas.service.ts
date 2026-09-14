import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

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

  findAll(userId: string, section?: CreateAreaDto['section'], subSection?: CreateAreaDto['subSection']) {
    return this.prisma.area.findMany({
      where: { userId, section, subSection },
      orderBy: { updatedAt: 'desc' },
    });
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
    await this.findOne(userId, id);
    return this.prisma.area.delete({ where: { id } });
  }
}
