import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateViewConfigurationDto,
  UpdateViewConfigurationDto,
} from './dto/view-configuration.dto';
import {
  validateCollectionFilters,
  validateCollectionOrder,
} from './collection-query';

@Injectable()
export class ViewConfigurationsService {
  constructor(private readonly prisma: PrismaService) {}

  private validate(dto: {
    name: string;
    filters?: unknown;
    orderBy?: string;
    orderDirection?: string;
    layout?: unknown;
    scope?: unknown;
  }) {
    if (
      typeof dto.name !== 'string' ||
      !dto.name.trim() ||
      dto.name.trim().length > 120
    )
      throw new BadRequestException('Informe um nome de até 120 caracteres.');
    if (
      dto.layout !== undefined &&
      (typeof dto.layout !== 'string' ||
        !['LIST', 'TABLE', 'BOARD'].includes(dto.layout))
    )
      throw new BadRequestException('Layout inválido.');
    if (
      dto.scope !== undefined &&
      (typeof dto.scope !== 'string' || !['ROOTS', 'ALL'].includes(dto.scope))
    )
      throw new BadRequestException('Escopo inválido.');
    validateCollectionFilters(dto.filters === undefined ? {} : dto.filters);
    validateCollectionOrder(dto.orderBy, dto.orderDirection);
  }

  private async write<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Já existe uma visualização com este nome neste contexto.',
        );
      throw error;
    }
  }

  create(userId: string, dto: CreateViewConfigurationDto) {
    this.validate(dto);
    return this.write(() =>
      this.prisma.viewConfiguration.create({
        data: {
          userId,
          name: dto.name.trim(),
          layout: dto.layout,
          scope: dto.scope,
          section: dto.section,
          subSection: dto.subSection,
          filters: (dto.filters || {}) as Prisma.InputJsonValue,
          orderBy: dto.orderBy || 'updatedAt',
          orderDirection: dto.orderDirection || 'desc',
        },
      }),
    );
  }

  async findAll(userId: string, section?: string, subSection?: string) {
    const where: Record<string, unknown> = { userId };
    if (section) where.section = section;
    if (subSection) where.subSection = subSection;

    const rows = await this.prisma.viewConfiguration.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
    return rows.map((row) => {
      try {
        this.validate(row);
        return { ...row, configurationError: null };
      } catch (error) {
        return {
          ...row,
          configurationError:
            error instanceof Error
              ? error.message
              : 'Configuração incompatível.',
        };
      }
    });
  }

  findOne(userId: string, id: string) {
    return this.prisma.viewConfiguration.findFirst({
      where: { id, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateViewConfigurationDto) {
    const existing = await this.findOne(userId, id);
    if (!existing) {
      throw new NotFoundException('Visualização não encontrada.');
    }

    this.validate({ ...existing, ...dto });

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.section !== undefined) updateData.section = dto.section;
    if (dto.subSection !== undefined) updateData.subSection = dto.subSection;
    if (dto.layout !== undefined) updateData.layout = dto.layout;
    if (dto.scope !== undefined) updateData.scope = dto.scope;
    if (dto.filters !== undefined) updateData.filters = dto.filters;
    if (dto.orderBy !== undefined) updateData.orderBy = dto.orderBy;
    if (dto.orderDirection !== undefined)
      updateData.orderDirection = dto.orderDirection;

    return this.write(() =>
      this.prisma.viewConfiguration.update({
        where: { id },
        data: updateData,
      }),
    );
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);
    if (!existing) {
      throw new NotFoundException('Visualização não encontrada.');
    }

    return this.prisma.viewConfiguration.delete({
      where: { id },
    });
  }
}
