import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AttachmentType, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { DuplicateAreaDto } from './dto/duplicate-area.dto';
import { ReorderAreaDto } from './dto/reorder-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { PurgeAreaDto } from './dto/purge-area.dto';
import { requireKnownDocument } from './portable-document';
import {
  validateCollectionFilters,
  validateCollectionOrder,
} from './collection-query';
import { ListAreasQueryDto } from './dto/list-areas-query.dto';

type AreaTreeNode = {
  id: string;
  userId: string;
  parentId: string | null;
  targetPageId: string | null;
  coverAttachmentId: string | null;
  coverPosition: number;
  fullWidth: boolean;
  sortOrder: number;
  section: CreateAreaDto['section'];
  subSection: CreateAreaDto['subSection'];
  nome: string;
  categoria: string;
  nivelEntendimento: number;
  icone: string | null;
  conteudo: Prisma.JsonValue;
  isFavorite: boolean;
  attachments: Array<{
    id: string;
    tipo: AttachmentType;
    url: string;
    nome: string | null;
  }>;
};

@Injectable()
export class AreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private withTreeLock<T>(
    userId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        // Serialize structural writers for this owner before reading the tree.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 7))::text`;
        return operation(tx);
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  }

  private async branchIds(
    tx: Prisma.TransactionClient,
    userId: string,
    rootId: string,
  ) {
    const seen = new Set([rootId]);
    let parents = [rootId];
    while (parents.length) {
      const children = await tx.area.findMany({
        where: { userId, parentId: { in: parents } },
        select: { id: true },
      });
      parents = [];
      for (const child of children) {
        if (seen.has(child.id))
          throw new ConflictException(
            'A hierarquia contém um ciclo. A operação foi cancelada.',
          );
        seen.add(child.id);
        parents.push(child.id);
      }
    }
    return [...seen];
  }

  private normalizeParentId(parentId?: string | null) {
    if (parentId === undefined || parentId === null) return null;
    const trimmed = parentId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeReferenceId(referenceId?: string | null) {
    if (referenceId === undefined || referenceId === null) return null;
    const trimmed = referenceId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private serializeSearchableText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value
        .map((entry) => this.serializeSearchableText(entry))
        .join(' ');
    }
    if (typeof value === 'object') {
      return Object.values(value)
        .map((entry) => this.serializeSearchableText(entry))
        .join(' ');
    }
    return '';
  }

  private remapJsonIds(value: unknown, idMap: Map<string, string>): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => this.remapJsonIds(entry, idMap));
    }
    if (value && typeof value === 'object') {
      const next: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value)) {
        if (
          (key === 'attachmentId' ||
            key === 'targetPageId' ||
            key === 'pageId') &&
          typeof entry === 'string' &&
          idMap.has(entry)
        ) {
          next[key] = idMap.get(entry);
          continue;
        }
        next[key] = this.remapJsonIds(entry, idMap);
      }
      return next;
    }
    return value;
  }

  private async ensureParentIsValid(
    userId: string,
    parentId?: string | null,
    areaId?: string,
    section?: CreateAreaDto['section'],
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const normalizedParentId = this.normalizeParentId(parentId);
    if (!normalizedParentId) return null;

    if (areaId && normalizedParentId === areaId) {
      throw new ConflictException(
        'Uma área não pode ser sua própria página mãe.',
      );
    }

    const parent = await db.area.findFirst({
      where: { id: normalizedParentId, userId, deletedAt: null },
      select: { id: true, section: true, subSection: true, parentId: true },
    });

    if (!parent) {
      throw new NotFoundException('Página mãe não encontrada para esta área.');
    }

    if (section !== undefined && parent.section !== section) {
      throw new ConflictException(
        'A página mãe deve pertencer à mesma seção da área.',
      );
    }

    let currentParentId = parent.parentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId))
        throw new ConflictException('A hierarquia contém um ciclo.');
      visited.add(currentParentId);

      if (currentParentId === areaId) {
        throw new ConflictException(
          'Não é possível criar um ciclo na hierarquia de páginas.',
        );
      }

      const currentParent = await db.area.findFirst({
        where: { id: currentParentId, userId, deletedAt: null },
        select: { id: true, section: true, subSection: true, parentId: true },
      });

      if (!currentParent)
        throw new ConflictException(
          'Um ancestral da página mãe está indisponível.',
        );
      currentParentId = currentParent.parentId;
    }
    return parent;
  }

  private async ensureTargetPageIsValid(
    userId: string,
    targetPageId?: string | null,
    areaId?: string,
  ) {
    const normalizedTargetPageId = this.normalizeReferenceId(targetPageId);
    if (!normalizedTargetPageId) return;

    if (areaId && normalizedTargetPageId === areaId) {
      throw new ConflictException('Uma área não pode referenciar a si mesma.');
    }

    const targetPage = await this.prisma.area.findFirst({
      where: { id: normalizedTargetPageId, userId, deletedAt: null },
      select: { id: true },
    });

    if (!targetPage) {
      throw new NotFoundException('Página referenciada não encontrada.');
    }
  }

  private async ensureCoverAttachmentIsValid(
    userId: string,
    areaId: string | undefined,
    coverAttachmentId?: string | null,
  ) {
    const normalizedCoverId = this.normalizeReferenceId(coverAttachmentId);
    if (!normalizedCoverId) return;

    const attachment = await this.prisma.attachment.findFirst({
      where: { id: normalizedCoverId, area: { userId } },
      select: { id: true, tipo: true },
    });

    if (!attachment) {
      throw new NotFoundException(
        'Anexo de capa não encontrado para esta área.',
      );
    }

    if (attachment.tipo !== AttachmentType.IMAGEM) {
      throw new BadRequestException(
        'A capa deve referenciar um anexo do tipo IMAGEM.',
      );
    }
  }

  private async nextSortOrder(
    userId: string,
    parentId: string | null,
    section: CreateAreaDto['section'],
    subSection: CreateAreaDto['subSection'],
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const sibling = await db.area.findFirst({
      where: {
        userId,
        parentId,
        section,
        subSection,
        deletedAt: null,
      },
      orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
      select: { sortOrder: true },
    });
    return (sibling?.sortOrder ?? -1) + 1;
  }

  private async collectBranch(
    userId: string,
    rootId: string,
    includeChildren: boolean,
  ): Promise<AreaTreeNode[]> {
    const root = await this.prisma.area.findFirst({
      where: { id: rootId, userId, deletedAt: null },
      include: { attachments: true },
    });
    if (!root) throw new NotFoundException('Área não encontrada');

    const nodes: AreaTreeNode[] = [root];
    if (!includeChildren) return nodes;

    const queue = [root.id];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.prisma.area.findMany({
        where: { userId, parentId, deletedAt: null },
        include: { attachments: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
      for (const child of children) {
        nodes.push(child);
        queue.push(child.id);
      }
    }

    return nodes;
  }

  async create(userId: string, dto: CreateAreaDto, key?: string) {
    if (key !== undefined && !isUUID(key, '4')) {
      throw new BadRequestException('Idempotency-Key deve ser um UUID v4.');
    }
    const canonical = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(canonical);
      if (value && typeof value === 'object')
        return Object.fromEntries(
          Object.entries(value)
            .filter(([, entry]) => entry !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, entry]) => [name, canonical(entry)]),
        );
      return value;
    };
    const requestHash = createHash('sha256')
      .update(JSON.stringify(canonical(dto)))
      .digest('hex');
    return this.withTreeLock(userId, async (tx) => {
      if (key) {
        const receipt = await tx.areaCreationRequest.findUnique({
          where: { userId_key: { userId, key } },
        });
        if (receipt) {
          if (receipt.requestHash !== requestHash)
            throw new ConflictException(
              'Esta chave de criação já foi usada para outro pedido.',
            );
          const existing = receipt.areaId
            ? await tx.area.findFirst({
                where: { id: receipt.areaId, userId, deletedAt: null },
              })
            : null;
          if (!existing)
            throw new ConflictException(
              'A página deste pedido está indisponível. A repetição não cria outra página.',
            );
          return existing;
        }
      }
      const {
        conteudo,
        parentId,
        targetPageId,
        coverAttachmentId,
        coverPosition,
        fullWidth,
        ...data
      } = dto;
      const normalizedParentId = this.normalizeParentId(parentId);
      const parent = await this.ensureParentIsValid(
        userId,
        parentId,
        undefined,
        undefined,
        tx,
      );
      await this.ensureTargetPageIsValid(userId, targetPageId, undefined);

      const sortOrder = await this.nextSortOrder(
        userId,
        normalizedParentId,
        parent?.section ?? dto.section,
        dto.subSection,
        tx,
      );

      const created = await tx.area.create({
        data: {
          ...data,
          section: parent?.section ?? dto.section,
          parentId: normalizedParentId,
          targetPageId: this.normalizeReferenceId(targetPageId),
          coverAttachmentId: null,
          coverPosition: coverPosition ?? 50,
          fullWidth: fullWidth ?? false,
          sortOrder,
          userId,
          conteudo: (conteudo ?? {}) as Prisma.InputJsonValue,
        },
      });

      if (key)
        await tx.areaCreationRequest.create({
          data: { userId, key, requestHash, areaId: created.id },
        });

      if (coverAttachmentId !== undefined && coverAttachmentId !== null) {
        await this.ensureCoverAttachmentIsValid(
          userId,
          created.id,
          coverAttachmentId,
        );
        return tx.area.update({
          where: { id: created.id },
          data: {
            coverAttachmentId: this.normalizeReferenceId(coverAttachmentId),
          },
        });
      }

      return created;
    });
  }

  findAll(
    userId: string,
    section?: CreateAreaDto['section'],
    subSection?: CreateAreaDto['subSection'],
    page = 1,
    limit = 20,
    parentId?: string | null,
    includeDeleted = false,
    filters?: Record<string, unknown>,
    orderBy?: string,
    orderDirection?: string,
    query?: ListAreasQueryDto,
  ) {
    return this.listCollection(
      userId,
      {
        ...query,
        section,
        subSection,
        page,
        limit,
        parentId,
        deleted: includeDeleted,
        filters,
        orderBy: orderBy ?? (query?.recent ? 'lastOpenedAt' : 'sortOrder'),
        orderDirection,
      },
      query?.scope !== undefined,
    );
  }

  async listCollection(
    userId: string,
    query: ListAreasQueryDto,
    metadataOnly = false,
  ) {
    const filters = validateCollectionFilters({
      ...query.filters,
      ...(query.q === undefined ? {} : { search: query.q }),
      ...Object.fromEntries(
        (['categoria', 'minLevel', 'maxLevel', 'isFavorite', 'recent'] as const)
          .filter((key) => query[key] !== undefined)
          .map((key) => [key, query[key]]),
      ),
    });
    const field =
      query.orderBy ?? (filters.recent ? 'lastOpenedAt' : 'updatedAt');
    const direction =
      query.orderDirection ?? (field === 'sortOrder' ? 'asc' : 'desc');
    validateCollectionOrder(field, direction);
    const where: Prisma.AreaWhereInput = {
      userId,
      section: query.section,
      subSection: query.subSection,
      ...(query.deleted ? {} : { deletedAt: null }),
      ...(query.scope === 'ROOTS'
        ? { parentId: null }
        : query.parentId === undefined
          ? {}
          : { parentId: this.normalizeParentId(query.parentId) }),
      ...(filters.isFavorite === undefined
        ? {}
        : { isFavorite: filters.isFavorite }),
      ...(filters.recent ? { opening: { is: { userId } } } : {}),
      ...(filters.categoria
        ? {
            categoria: {
              equals: filters.categoria.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(filters.minLevel === undefined && filters.maxLevel === undefined
        ? {}
        : {
            nivelEntendimento: { gte: filters.minLevel, lte: filters.maxLevel },
          }),
      ...(filters.search?.trim()
        ? {
            OR: ['nome', 'categoria'].map((key) => ({
              [key]: { contains: filters.search!.trim(), mode: 'insensitive' },
            })),
          }
        : {}),
    };
    const orderBy: Prisma.AreaOrderByWithRelationInput[] =
      field === 'sortOrder'
        ? [
            { sortOrder: direction as Prisma.SortOrder },
            { id: direction as Prisma.SortOrder },
          ]
        : field === 'lastOpenedAt'
          ? [
              { opening: { lastOpenedAt: direction as Prisma.SortOrder } },
              { id: direction as Prisma.SortOrder },
            ]
          : [{ [field]: direction }, { id: direction as Prisma.SortOrder }];
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.area.count({ where });
        const totalPages = Math.ceil(total / query.limit);
        const page = Math.min(query.page, Math.max(1, totalPages));
        const opening = { select: { lastOpenedAt: true } } as const;
        const args = {
          where,
          orderBy,
          skip: (page - 1) * query.limit,
          take: query.limit,
        };
        const items = metadataOnly
          ? await tx.area.findMany({
              ...args,
              select: {
                id: true,
                parentId: true,
                section: true,
                subSection: true,
                nome: true,
                categoria: true,
                nivelEntendimento: true,
                icone: true,
                sortOrder: true,
                isFavorite: true,
                updatedAt: true,
                deletedAt: true,
                opening,
              },
            })
          : await tx.area.findMany({ ...args, include: { opening } });
        return {
          items: items.map((item) => {
            const { opening: visit, ...area } = item as typeof item & {
              opening?: { lastOpenedAt: Date } | null;
            };
            return { ...area, lastOpenedAt: visit?.lastOpenedAt ?? null };
          }),
          pagination: { page, limit: query.limit, total, totalPages },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async markOpened(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Coordinate with deletion; no UPDATE is issued against Area.
      await tx.$queryRaw`SELECT "id" FROM "Area" WHERE "id" = ${id} AND "userId" = ${userId} AND "deletedAt" IS NULL FOR SHARE`;
      const area = await tx.area.findFirst({
        where: { id, userId, deletedAt: null },
        select: { id: true },
      });
      if (!area) throw new NotFoundException('Página indisponível.');
      return tx.areaOpening.upsert({
        where: { areaId: id },
        create: { areaId: id, userId },
        update: { lastOpenedAt: new Date() },
        select: { areaId: true, lastOpenedAt: true },
      });
    });
  }

  async findTrash(userId: string, page = 1, limit = 20) {
    const where = { userId, deletedAt: { not: null } };
    const [items, total] = await Promise.all([
      this.prisma.area.findMany({
        where,
        orderBy: [{ deletedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.area.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async search(userId: string, rawQuery: string, page = 1, limit = 20) {
    const query = rawQuery?.trim().toLowerCase() ?? '';
    if (!query) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    const allAreas = await this.prisma.area.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    const matches = allAreas.filter((area) => {
      const haystack = [
        area.nome,
        area.categoria,
        area.section,
        area.subSection,
        this.serializeSearchableText(area.conteudo),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    const start = (page - 1) * limit;
    const paginated = matches.slice(start, start + limit);

    return {
      items: paginated,
      pagination: {
        page,
        limit,
        total: matches.length,
        totalPages: Math.max(1, Math.ceil(matches.length / limit)),
      },
    };
  }

  async resolveReferences(userId: string, ids: string[]) {
    const pages = await this.prisma.area.findMany({
      where: { userId, deletedAt: null, id: { in: [...new Set(ids)] } },
      select: { id: true, nome: true, icone: true, section: true },
    });
    const found = new Map(pages.map((page) => [page.id, page]));
    return {
      items: [...new Set(ids)].map((id) => {
        const page = found.get(id);
        return page ? { ...page, available: true } : { id, available: false };
      }),
    };
  }

  async findOne(
    userId: string,
    id: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const area = await db.area.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        opening: { select: { lastOpenedAt: true } },
        attachments: true,
        coverAttachment: true,
        parent: true,
        children: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
        targetPage: {
          select: {
            id: true,
            nome: true,
            categoria: true,
            section: true,
            subSection: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!area) throw new NotFoundException('Área não encontrada');

    const attachments = area.attachments ?? [];
    const signedAttachments =
      attachments.length > 0
        ? await this.storage.signAttachmentUrls(attachments)
        : attachments;
    const signedCover = area.coverAttachment
      ? await this.storage.signAttachmentUrl(area.coverAttachment)
      : null;

    return {
      ...area,
      lastOpenedAt: area.opening?.lastOpenedAt ?? null,
      attachments: signedAttachments,
      coverAttachment: signedCover,
    };
  }

  async update(userId: string, id: string, dto: UpdateAreaDto) {
    return this.withTreeLock(userId, async (tx) => {
      const area = await this.findOne(userId, id, tx);
      if (dto.conteudo !== undefined) {
        requireKnownDocument(area.conteudo);
        requireKnownDocument(dto.conteudo);
      }
      const {
        conteudo,
        updatedAt,
        parentId,
        targetPageId,
        coverAttachmentId,
        ...data
      } = dto;

      const parent = await this.ensureParentIsValid(
        userId,
        parentId === undefined ? area.parentId : parentId,
        id,
        undefined,
        tx,
      );
      if (
        parentId === undefined &&
        parent &&
        dto.section !== undefined &&
        dto.section !== parent.section
      ) {
        throw new ConflictException(
          'Mova a página para uma nova mãe ou para a raiz antes de trocar a seção.',
        );
      }
      const section = parent?.section ?? dto.section ?? area.section;
      await this.ensureTargetPageIsValid(userId, targetPageId, id);
      if (coverAttachmentId !== undefined) {
        await this.ensureCoverAttachmentIsValid(userId, id, coverAttachmentId);
      }

      const updateData = {
        ...data,
        section,
        ...(parentId === undefined
          ? {}
          : { parentId: this.normalizeParentId(parentId) }),
        ...(targetPageId === undefined
          ? {}
          : { targetPageId: this.normalizeReferenceId(targetPageId) }),
        ...(coverAttachmentId === undefined
          ? {}
          : {
              coverAttachmentId: this.normalizeReferenceId(coverAttachmentId),
            }),
        ...(conteudo === undefined
          ? {}
          : { conteudo: conteudo as Prisma.InputJsonValue }),
      };

      const expectedUpdatedAt = new Date(updatedAt);
      const currentUpdatedAt = new Date(area.updatedAt);

      if (expectedUpdatedAt.getTime() !== currentUpdatedAt.getTime()) {
        throw new ConflictException(
          'Este bloco foi atualizado por outro usuário. Recarregue a página e tente novamente.',
        );
      }

      const [updatedArea] = await tx.area.updateManyAndReturn({
        where: { id, userId, updatedAt: expectedUpdatedAt, deletedAt: null },
        data: {
          ...updateData,
          updatedAt: new Date(
            Math.max(Date.now(), currentUpdatedAt.getTime() + 1),
          ),
        },
      });

      if (!updatedArea) {
        throw new ConflictException(
          'Este bloco foi atualizado por outro usuário. Recarregue a página e tente novamente.',
        );
      }

      if (section !== area.section) {
        const ids = await this.branchIds(tx, userId, id);
        await tx.area.updateMany({
          where: { userId, id: { in: ids.filter((item) => item !== id) } },
          data: { section },
        });
      }

      return { ...updatedArea, lastOpenedAt: area.lastOpenedAt };
    });
  }

  async toggleFavorite(userId: string, id: string) {
    const area = await this.findOne(userId, id);
    const updated = await this.prisma.area.update({
      where: { id, userId },
      data: {
        isFavorite: !area.isFavorite,
      },
    });
    return { ...updated, lastOpenedAt: area.lastOpenedAt };
  }

  async trash(userId: string, id: string) {
    return this.withTreeLock(userId, async (tx) => {
      const area = await this.findOne(userId, id, tx);
      const ids = await this.branchIds(tx, userId, id);
      const deletionBatchId = randomUUID();
      await tx.area.updateMany({
        where: { userId, id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date(), deletionBatchId },
      });
      return tx.area.findUniqueOrThrow({ where: { id: area.id } });
    });
  }

  async restore(userId: string, id: string) {
    return this.withTreeLock(userId, async (tx) => {
      const area = await tx.area.findFirst({
        where: { id, userId, deletedAt: { not: null } },
      });

      if (!area) throw new NotFoundException('Área na lixeira não encontrada');

      const members = await tx.area.findMany({
        where: {
          userId,
          deletedAt: { not: null },
          ...(area.deletionBatchId
            ? { deletionBatchId: area.deletionBatchId }
            : { id }),
        },
      });
      const byId = new Map(members.map((member) => [member.id, member]));
      const restored = new Map<
        string,
        { parentId: string | null; section: CreateAreaDto['section'] }
      >();
      let detached = false;
      const resolve = async (
        memberId: string,
        seen = new Set<string>(),
      ): Promise<{
        parentId: string | null;
        section: CreateAreaDto['section'];
      }> => {
        const cached = restored.get(memberId);
        if (cached) return cached;
        if (seen.has(memberId))
          throw new ConflictException(
            'O lote contém um ciclo. A restauração foi cancelada.',
          );
        seen.add(memberId);
        const member = byId.get(memberId)!;
        let parentId = member.parentId;
        let section = member.section;
        if (parentId && byId.has(parentId))
          section = (await resolve(parentId, seen)).section;
        else if (parentId) {
          const parent = await tx.area.findFirst({
            where: { id: parentId, userId, deletedAt: null },
          });
          if (parent) {
            await this.ensureParentIsValid(
              userId,
              parentId,
              memberId,
              undefined,
              tx,
            );
            section = parent.section;
          } else {
            parentId = null;
            detached = true;
          }
        }
        const result = { parentId, section };
        restored.set(memberId, result);
        return result;
      };
      for (const member of members) await resolve(member.id);
      for (const member of members)
        await tx.area.update({
          where: { id: member.id },
          data: {
            deletedAt: null,
            deletionBatchId: null,
            ...restored.get(member.id)!,
          },
        });
      return {
        ...(await tx.area.findUniqueOrThrow({ where: { id } })),
        restoredIds: members.map((member) => member.id),
        warning: detached
          ? 'A página mãe está indisponível; o ramo foi restaurado na raiz da mesma seção.'
          : undefined,
      };
    });
  }

  async reorder(userId: string, id: string, dto: ReorderAreaDto) {
    await this.withTreeLock(userId, async (tx) => {
      const area = await this.findOne(userId, id, tx);
      const nextParentId =
        dto.parentId === undefined
          ? area.parentId
          : this.normalizeParentId(dto.parentId);

      const parent = await this.ensureParentIsValid(
        userId,
        nextParentId,
        id,
        undefined,
        tx,
      );
      const section = parent?.section ?? area.section;

      const beforeId = this.normalizeReferenceId(dto.beforeId);
      const afterId = this.normalizeReferenceId(dto.afterId);

      if (beforeId && afterId) {
        throw new BadRequestException(
          'Informe apenas beforeId ou afterId, não ambos.',
        );
      }

      const siblings = await tx.area.findMany({
        where: {
          userId,
          parentId: nextParentId,
          section,
          subSection: area.subSection,
          deletedAt: null,
          NOT: { id },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });

      const orderedIds = siblings.map((sibling) => sibling.id);
      let insertAt = orderedIds.length;

      if (beforeId) {
        const index = orderedIds.indexOf(beforeId);
        if (index < 0) {
          throw new BadRequestException(
            'beforeId deve ser um irmão válido no destino.',
          );
        }
        insertAt = index;
      } else if (afterId) {
        const index = orderedIds.indexOf(afterId);
        if (index < 0) {
          throw new BadRequestException(
            'afterId deve ser um irmão válido no destino.',
          );
        }
        insertAt = index + 1;
      }

      orderedIds.splice(insertAt, 0, id);

      for (const [index, siblingId] of orderedIds.entries()) {
        await tx.area.update({
          where: { id: siblingId },
          data: {
            parentId: nextParentId,
            section,
            sortOrder: index,
          },
        });
      }
      if (section !== area.section) {
        const ids = await this.branchIds(tx, userId, id);
        await tx.area.updateMany({
          where: { userId, id: { in: ids.filter((item) => item !== id) } },
          data: { section },
        });
      }
    });

    return this.findOne(userId, id);
  }

  async duplicate(userId: string, id: string, dto: DuplicateAreaDto = {}) {
    const includeChildren = dto.includeChildren === true;
    const nodes = await this.collectBranch(userId, id, includeChildren);
    const root = nodes[0];
    const destinationParentId =
      dto.parentId === undefined
        ? root.parentId
        : this.normalizeParentId(dto.parentId);

    await this.ensureParentIsValid(
      userId,
      destinationParentId,
      undefined,
      root.section,
    );

    const areaIdMap = new Map<string, string>();
    const attachmentIdMap = new Map<string, string>();
    for (const node of nodes) {
      areaIdMap.set(node.id, randomUUID());
      for (const attachment of node.attachments) {
        attachmentIdMap.set(attachment.id, randomUUID());
      }
    }

    const copiedStorageKeys: string[] = [];
    const attachmentCopies: Array<{
      id: string;
      areaId: string;
      tipo: AttachmentType;
      url: string;
      nome: string | null;
    }> = [];

    try {
      for (const node of nodes) {
        const newAreaId = areaIdMap.get(node.id)!;
        for (const attachment of node.attachments) {
          const newAttachmentId = attachmentIdMap.get(attachment.id)!;
          let nextUrl = attachment.url.split('?')[0];

          if (
            attachment.tipo !== AttachmentType.LINK &&
            this.storage.isConfigured()
          ) {
            const sourceKey = this.storage.resolveStorageKeyFromUrl(nextUrl);
            if (sourceKey) {
              const extension = sourceKey.includes('.')
                ? sourceKey.slice(sourceKey.lastIndexOf('.'))
                : '';
              const destinationKey = `uploads/${userId}/${newAreaId}/${randomUUID()}${extension}`;
              nextUrl = await this.storage.copyObject(nextUrl, destinationKey);
              copiedStorageKeys.push(destinationKey);
            }
          }

          attachmentCopies.push({
            id: newAttachmentId,
            areaId: newAreaId,
            tipo: attachment.tipo,
            url: nextUrl,
            nome: attachment.nome,
          });
        }
      }

      const createdRoot = await this.withTreeLock(userId, async (tx) => {
        await this.ensureParentIsValid(
          userId,
          destinationParentId,
          undefined,
          root.section,
          tx,
        );
        const rootSortOrder = await this.nextSortOrder(
          userId,
          destinationParentId,
          root.section,
          root.subSection,
          tx,
        );
        let rootCreated: { id: string } | null = null;

        for (const [index, node] of nodes.entries()) {
          const newId = areaIdMap.get(node.id)!;
          const mappedParentId =
            node.id === root.id
              ? destinationParentId
              : node.parentId
                ? (areaIdMap.get(node.parentId) ?? null)
                : null;
          const remappedContent = this.remapJsonIds(
            node.conteudo,
            new Map([...areaIdMap, ...attachmentIdMap]),
          );

          const created = await tx.area.create({
            data: {
              id: newId,
              userId,
              parentId: mappedParentId,
              // A reference may point to a descendant not inserted yet.
              // Resolve it after every page in the branch exists.
              targetPageId: null,
              coverAttachmentId: null,
              coverPosition: node.coverPosition,
              fullWidth: node.fullWidth,
              sortOrder: node.id === root.id ? rootSortOrder : node.sortOrder,
              section: node.section,
              subSection: node.subSection,
              nome: index === 0 ? `${node.nome} (cópia)` : node.nome,
              categoria: node.categoria,
              nivelEntendimento: node.nivelEntendimento,
              icone: node.icone,
              conteudo: remappedContent as Prisma.InputJsonValue,
              isFavorite: false,
            },
          });

          if (node.id === root.id) rootCreated = created;
        }

        if (attachmentCopies.length > 0) {
          await tx.attachment.createMany({ data: attachmentCopies });
        }

        for (const node of nodes) {
          const newId = areaIdMap.get(node.id)!;
          const mappedCoverId = node.coverAttachmentId
            ? (attachmentIdMap.get(node.coverAttachmentId) ?? null)
            : null;
          const mappedTargetPageId = node.targetPageId
            ? (areaIdMap.get(node.targetPageId) ?? node.targetPageId)
            : null;
          if (mappedCoverId || mappedTargetPageId) {
            await tx.area.update({
              where: { id: newId },
              data: {
                coverAttachmentId: mappedCoverId,
                targetPageId: mappedTargetPageId,
              },
            });
          }
        }

        return rootCreated;
      });

      if (!createdRoot) {
        throw new ConflictException('Não foi possível duplicar a área.');
      }

      return this.findOne(userId, createdRoot.id);
    } catch (error) {
      for (const key of copiedStorageKeys) {
        try {
          await this.storage.delete({
            bucket: this.storage.getBucket(),
            key,
          });
        } catch {
          // Compensação best-effort: a falha original prevalece.
        }
      }
      throw error;
    }
  }

  async purge(userId: string, id: string, dto: PurgeAreaDto) {
    if (dto.confirmed !== true) {
      throw new BadRequestException('Confirme a exclusão definitiva do ramo.');
    }
    return this.withTreeLock(userId, async (tx) => {
      const root = await tx.area.findFirst({ where: { id, userId } });
      if (!root) throw new NotFoundException('Área não encontrada');
      if (!root.deletedAt) {
        throw new ConflictException(
          'Envie a página para a lixeira antes de excluir definitivamente.',
        );
      }
      if (root.updatedAt.toISOString() !== dto.updatedAt) {
        throw new ConflictException(
          'A página mudou. Recarregue a lixeira e confirme novamente.',
        );
      }
      const ids = await this.branchIds(tx, userId, id);
      const members = await tx.area.findMany({
        where: { userId, id: { in: ids } },
        include: { attachments: true },
      });
      if (members.some((member) => !member.deletedAt)) {
        throw new ConflictException(
          'O ramo contém páginas ativas. A exclusão foi cancelada.',
        );
      }
      if (await tx.pageRevision.count({ where: { areaId: { in: ids } } })) {
        throw new ConflictException(
          'O ramo possui versões retidas e não pode ser excluído definitivamente.',
        );
      }
      try {
        for (const member of members) {
          for (const file of member.attachments) {
            if (file.tipo !== AttachmentType.LINK) {
              this.storage.requireOwnedAttachmentKey(
                file.url,
                userId,
                member.id,
              );
              await this.storage.deleteByUrl(file.url);
            }
          }
        }
      } catch {
        throw new ServiceUnavailableException({
          code: 'PURGE_STORAGE_CLEANUP_FAILED',
          message:
            'A limpeza dos arquivos foi interrompida. O ramo continua na lixeira, mas alguns arquivos podem já ter sido removidos. Tente excluir definitivamente novamente; não restaure o ramo antes de concluir a limpeza.',
        });
      }
      await tx.area.deleteMany({ where: { userId, id: { in: ids } } });
      return { purgedIds: ids };
    });
  }

  async remove(userId: string, id: string) {
    const area = await this.findOne(userId, id);
    if (await this.prisma.pageRevision.count({ where: { areaId: id } })) {
      throw new ConflictException(
        'A página possui versões retidas e não pode ser excluída definitivamente.',
      );
    }

    for (const attachment of area.attachments ?? []) {
      await this.storage.deleteByUrl(attachment.url);
    }

    return this.prisma.area.delete({ where: { id } });
  }
}
