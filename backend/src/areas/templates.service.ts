import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentType, Prisma, TemplateType } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import { fromBuffer } from 'file-type';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ApplyTemplateDto,
  TemplateFromPageDto,
} from './dto/template.dto';
import {
  assertAttachmentReferences,
  remapAttachments,
  requireKnownDocument,
  safeLink,
} from './portable-document';

const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytesHash = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
const includeFiles = { files: { orderBy: { id: 'asc' as const } } };
function renewBlockIds(value: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (Array.isArray(value))
    return (value as readonly (Prisma.InputJsonValue | null)[]).map((entry) =>
      entry === null ? null : renewBlockIds(entry),
    );
  if (value && typeof value === 'object') {
    const node = value as Record<string, Prisma.InputJsonValue>;
    return Object.fromEntries(
      Object.entries(node).map(([key, entry]) => [
        key,
        key === 'attrs' &&
        entry &&
        typeof entry === 'object' &&
        !Array.isArray(entry)
          ? { ...entry, ...('id' in entry ? { id: randomUUID() } : {}) }
          : entry === null
            ? null
            : renewBlockIds(entry),
      ]),
    );
  }
  return value;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private name(name: string) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120)
      throw new BadRequestException('Informe um nome de até 120 caracteres.');
    return name.trim();
  }

  create(userId: string, dto: CreateTemplateDto) {
    requireKnownDocument(dto.content ?? {});
    assertAttachmentReferences(dto.content ?? {}, null, new Set());
    return this.prisma.template.create({
      data: {
        userId,
        name: this.name(dto.name),
        description: dto.description,
        type: dto.type,
        section: dto.section,
        subSection: dto.subSection,
        content: (dto.content ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  findAll(
    userId: string,
    type?: string,
    section?: string,
    subSection?: string,
  ) {
    return this.prisma.template.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(type ? { type: type as CreateTemplateDto['type'] } : {}),
        ...(section
          ? { section: section as CreateTemplateDto['section'] }
          : {}),
        ...(subSection
          ? { subSection: subSection as CreateTemplateDto['subSection'] }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        section: true,
        subSection: true,
        updatedAt: true,
      },
    });
  }

  findOne(userId: string, id: string) {
    return this.prisma.template.findFirst({
      where: { id, userId, deletedAt: null },
      include: includeFiles,
    });
  }

  async preview(userId: string, id: string) {
    const template = await this.findOne(userId, id);
    if (!template) throw new NotFoundException('Modelo não encontrado.');
    const files = await Promise.all(
      template.files.map(async (file) => ({
        id: file.attachmentId,
        tipo: file.tipo,
        nome: file.nome,
        url: file.storageKey
          ? await this.storage.signUrl({
              bucket: this.storage.getBucket(),
              key: file.storageKey,
            })
          : file.linkUrl,
      })),
    );
    return { ...template, files };
  }

  async update(userId: string, id: string, dto: UpdateTemplateDto) {
    const existing = await this.findOne(userId, id);
    if (!existing) throw new NotFoundException('Modelo não encontrado.');
    if (
      dto.type !== undefined &&
      !Object.values(TemplateType).includes(dto.type)
    )
      throw new BadRequestException('Tipo de modelo inválido.');
    if (dto.content !== undefined) {
      requireKnownDocument(dto.content);
      assertAttachmentReferences(
        dto.content,
        null,
        new Set(existing.files.map((file) => file.attachmentId)),
      );
    }
    return this.prisma.template.update({
      where: { id, userId, deletedAt: null },
      data: {
        description: dto.description,
        type: dto.type,
        ...(dto.name === undefined ? {} : { name: this.name(dto.name) }),
        ...(dto.content === undefined
          ? {}
          : { content: dto.content as Prisma.InputJsonValue }),
      },
    });
  }

  private async compensate(keys: string[]) {
    for (const key of keys) {
      try {
        await this.storage.delete({ bucket: this.storage.getBucket(), key });
      } catch {
        this.logger.error(`Falha ao limpar cópia de modelo: ${key}`);
      }
    }
  }

  async remove(userId: string, id: string) {
    // Retain a tombstone and its manifest if storage cleanup fails; DELETE can be retried.
    const template = await this.prisma.$transaction(async (tx) => {
      const row = await tx.template.findFirst({
        where: { id, userId },
        include: includeFiles,
      });
      if (!row) throw new NotFoundException('Modelo não encontrado.');
      await tx.template.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return row;
    });
    for (const file of template.files) {
      if (file.storageKey)
        await this.storage.delete({
          bucket: this.storage.getBucket(),
          key: file.storageKey,
        });
    }
    await this.prisma.template.deleteMany({ where: { id, userId } });
    return { id, deleted: true };
  }

  async fromPage(userId: string, dto: TemplateFromPageDto) {
    const name = this.name(dto.name);
    const source = await this.prisma.area.findFirst({
      where: { id: dto.pageId, userId, deletedAt: null },
      include: { attachments: { orderBy: { id: 'asc' } } },
    });
    if (!source) throw new NotFoundException('Página indisponível.');
    if (source.updatedAt.getTime() !== new Date(dto.updatedAt).getTime())
      throw new ConflictException(
        'A página mudou. Salve e tente criar o modelo novamente.',
      );
    requireKnownDocument(source.conteudo);
    assertAttachmentReferences(
      source.conteudo,
      source.coverAttachmentId,
      new Set(source.attachments.map((file) => file.id)),
    );
    const id = randomUUID(),
      keys: string[] = [];
    const files: Prisma.TemplateFileCreateWithoutTemplateInput[] = [];
    let totalBytes = 0;
    try {
      for (const file of source.attachments) {
        if (file.tipo === AttachmentType.LINK) {
          const link = safeLink(file.url);
          if (!link)
            throw new BadRequestException(
              'Corrija o link do material antes de criar o modelo.',
            );
          files.push({
            attachmentId: file.id,
            tipo: file.tipo,
            nome: file.nome,
            linkUrl: link,
          });
        } else {
          const sourceKey = this.storage.requireOwnedAttachmentKey(
            file.url,
            userId,
            source.id,
          );
          const bytes = await this.storage.readObject(sourceKey);
          totalBytes += bytes.length;
          if (totalBytes > 100 * 1024 * 1024)
            throw new BadRequestException('A mídia do modelo excede 100 MiB.');
          const storageKey = `templates/${userId}/${id}/${file.id}`;
          keys.push(storageKey);
          await this.storage.upload({
            bucket: this.storage.getBucket(),
            key: storageKey,
            body: bytes,
            contentType:
              (await fromBuffer(bytes))?.mime ?? 'application/octet-stream',
          });
          files.push({
            attachmentId: file.id,
            tipo: file.tipo,
            nome: file.nome,
            storageKey,
            sha256: bytesHash(bytes),
          });
        }
      }
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Area" WHERE "id" = ${source.id} AND "userId" = ${userId} FOR UPDATE`;
        const fresh = await tx.area.findFirst({
          where: { id: source.id, userId, deletedAt: null },
          include: { attachments: { orderBy: { id: 'asc' } } },
        });
        if (!fresh || hash(fresh) !== hash(source))
          throw new ConflictException(
            'A página ou os materiais mudaram durante a captura. Tente novamente.',
          );
        const {
          nome,
          categoria,
          nivelEntendimento,
          icone,
          coverAttachmentId,
          coverPosition,
          fullWidth,
          targetPageId,
        } = source;
        return tx.template.create({
          data: {
            id,
            userId,
            name,
            description: dto.description,
            type: dto.type,
            section: source.section,
            subSection: source.subSection,
            content: source.conteudo as Prisma.InputJsonValue,
            metadata: {
              nome,
              categoria,
              nivelEntendimento,
              icone,
              coverAttachmentId,
              coverPosition,
              fullWidth,
              targetPageId,
            },
            files: { create: files },
          },
        });
      });
    } catch (error) {
      await this.compensate(keys);
      throw error;
    }
  }

  private async receipt(
    db: Prisma.TransactionClient,
    userId: string,
    key: string | undefined,
    requestHash: string,
  ) {
    if (!key) return null;
    const receipt = await db.areaCreationRequest.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!receipt) return null;
    if (receipt.requestHash !== requestHash)
      throw new ConflictException(
        'Esta chave de criação já foi usada para outro pedido.',
      );
    const area = receipt.areaId
      ? await db.area.findFirst({
          where: { id: receipt.areaId, userId, deletedAt: null },
        })
      : null;
    if (!area)
      throw new ConflictException(
        'A página deste pedido está indisponível. A repetição não cria outra página.',
      );
    return area;
  }

  async apply(
    userId: string,
    templateId: string,
    dto: ApplyTemplateDto,
    key?: string,
  ) {
    if (key !== undefined && !isUUID(key, '4'))
      throw new BadRequestException('Idempotency-Key deve ser um UUID v4.');
    if (dto.targetAreaId)
      throw new BadRequestException(
        'Modelos criam páginas novas. Escolha a página mãe pelo campo parentId.',
      );
    const requestHash = hash({
      operation: 'template.apply',
      templateId,
      section: dto.section,
      subSection: dto.subSection,
      parentId: dto.parentId ?? null,
    });
    const existing = await this.receipt(this.prisma, userId, key, requestHash);
    if (existing) return existing;
    const template = await this.findOne(userId, templateId);
    if (!template) throw new NotFoundException('Modelo não encontrado.');
    requireKnownDocument(template.content);
    const metadata = template.metadata as Record<string, Prisma.JsonValue>;
    const coverId =
      typeof metadata.coverAttachmentId === 'string'
        ? metadata.coverAttachmentId
        : null;
    try {
      assertAttachmentReferences(
        template.content,
        coverId,
        new Set(template.files.map((file) => file.attachmentId)),
      );
    } catch {
      throw new BadRequestException(
        'Este modelo não possui cópia válida da mídia. Recrie-o a partir da página de origem.',
      );
    }
    const pageId = randomUUID(),
      keys: string[] = [],
      ids = new Map<string, string>();
    const attachments: Prisma.AttachmentCreateManyInput[] = [];
    let committed = false,
      totalBytes = 0;
    try {
      for (const file of template.files) {
        const attachmentId = randomUUID();
        ids.set(file.attachmentId, attachmentId);
        let url = file.linkUrl ?? '';
        if (file.storageKey) {
          if (
            !file.storageKey.startsWith(`templates/${userId}/${template.id}/`)
          )
            throw new BadRequestException('Mídia de modelo inválida.');
          const bytes = await this.storage.readObject(file.storageKey);
          totalBytes += bytes.length;
          if (
            totalBytes > 100 * 1024 * 1024 ||
            bytesHash(bytes) !== file.sha256
          )
            throw new BadRequestException(
              'Integridade ou tamanho da mídia do modelo inválido.',
            );
          const storageKey = `${userId}/${pageId}/${attachmentId}`;
          keys.push(storageKey);
          await this.storage.upload({
            bucket: this.storage.getBucket(),
            key: storageKey,
            body: bytes,
            contentType:
              (await fromBuffer(bytes))?.mime ?? 'application/octet-stream',
          });
          url = this.storage.buildPublicUrlFromKey(storageKey);
        }
        attachments.push({
          id: attachmentId,
          areaId: pageId,
          tipo: file.tipo,
          nome: file.nome,
          url,
        });
      }
      const result = await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 7))::text`;
          const replay = await this.receipt(tx, userId, key, requestHash);
          if (replay) return { area: replay, replay: true };
          await tx.$queryRaw`SELECT "id" FROM "Template" WHERE "id" = ${templateId} AND "userId" = ${userId} FOR UPDATE`;
          const fresh = await tx.template.findFirst({
            where: { id: templateId, userId, deletedAt: null },
            include: includeFiles,
          });
          if (!fresh || hash(fresh) !== hash(template))
            throw new ConflictException(
              'O modelo mudou durante a aplicação. Selecione-o novamente.',
            );
          if (dto.parentId) {
            const parent = await tx.area.findFirst({
              where: { id: dto.parentId, userId, deletedAt: null },
            });
            if (!parent)
              throw new NotFoundException('Página mãe indisponível.');
            if (parent.section !== dto.section)
              throw new ConflictException(
                'A página mãe deve pertencer à área escolhida.',
              );
          }
          const last = await tx.area.findFirst({
            where: {
              userId,
              parentId: dto.parentId ?? null,
              section: dto.section,
              subSection: dto.subSection,
              deletedAt: null,
            },
            orderBy: [{ sortOrder: 'desc' }, { id: 'desc' }],
          });
          const target =
            typeof metadata.targetPageId === 'string'
              ? await tx.area.findFirst({
                  where: { id: metadata.targetPageId, userId, deletedAt: null },
                  select: { id: true },
                })
              : null;
          await tx.area.create({
            data: {
              id: pageId,
              userId,
              parentId: dto.parentId ?? null,
              section: dto.section,
              subSection: dto.subSection,
              nome:
                typeof metadata.nome === 'string'
                  ? metadata.nome
                  : template.name,
              categoria:
                typeof metadata.categoria === 'string'
                  ? metadata.categoria
                  : template.type.toLowerCase(),
              nivelEntendimento:
                typeof metadata.nivelEntendimento === 'number'
                  ? metadata.nivelEntendimento
                  : 0,
              icone: typeof metadata.icone === 'string' ? metadata.icone : '✦',
              coverPosition:
                typeof metadata.coverPosition === 'number'
                  ? metadata.coverPosition
                  : 50,
              fullWidth: metadata.fullWidth === true,
              targetPageId: target?.id ?? null,
              sortOrder: (last?.sortOrder ?? -1) + 1,
              conteudo: renewBlockIds(remapAttachments(template.content, ids)),
            },
          });
          if (attachments.length)
            await tx.attachment.createMany({ data: attachments });
          if (coverId)
            await tx.area.update({
              where: { id: pageId },
              data: { coverAttachmentId: ids.get(coverId) },
            });
          if (key)
            await tx.areaCreationRequest.create({
              data: { userId, key, requestHash, areaId: pageId },
            });
          return {
            area: await tx.area.findUniqueOrThrow({ where: { id: pageId } }),
            replay: false,
          };
        },
        { timeout: 20000, maxWait: 10000 },
      );
      committed = !result.replay;
      if (result.replay) await this.compensate(keys);
      return result.area;
    } catch (error) {
      if (!committed) await this.compensate(keys);
      throw error;
    }
  }
}
