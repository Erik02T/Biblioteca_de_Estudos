import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AttachmentType, Prisma, SubSectionType } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { fromBuffer } from 'file-type';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateRevisionDto, RevisionTokenDto } from './dto/portability.dto';
import {
  assertAttachmentReferences,
  remapAttachments,
  requireKnownDocument,
  safeLink,
} from './portable-document';

const includeFiles = { attachments: { orderBy: { id: 'asc' as const } } };
type Captured = Prisma.AreaGetPayload<{ include: typeof includeFiles }>;
type Metadata = {
  nome: string;
  categoria: string;
  subSection: SubSectionType;
  nivelEntendimento: number;
  icone: string | null;
  coverAttachmentId: string | null;
  coverPosition: number;
  fullWidth: boolean;
};
type FileInput = {
  attachmentId: string;
  tipo: AttachmentType;
  nome: string | null;
  storageKey: string | null;
  linkUrl: string | null;
  sha256: string | null;
};
export const fingerprint = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class RevisionsService {
  private readonly logger = new Logger(RevisionsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async capture(userId: string, id: string) {
    const area = await this.prisma.area.findFirst({
      where: { id, userId, deletedAt: null },
      include: includeFiles,
    });
    if (!area) throw new NotFoundException('Página não encontrada.');
    return area;
  }

  private checkToken(area: Captured, token: string) {
    if (area.updatedAt.getTime() !== new Date(token).getTime())
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message: 'A página mudou. Recarregue antes de continuar.',
      });
  }

  private metadata(area: Captured): Metadata {
    const {
      nome,
      categoria,
      subSection,
      nivelEntendimento,
      icone,
      coverAttachmentId,
      coverPosition,
      fullWidth,
    } = area;
    return {
      nome,
      categoria,
      subSection,
      nivelEntendimento,
      icone,
      coverAttachmentId,
      coverPosition,
      fullWidth,
    };
  }

  private async copyFiles(
    area: Captured,
    revisionId: string,
    createdKeys: string[],
  ): Promise<FileInput[]> {
    assertAttachmentReferences(
      area.conteudo,
      area.coverAttachmentId,
      new Set(area.attachments.map((file) => file.id)),
    );
    const files: FileInput[] = [];
    for (const attachment of area.attachments) {
      if (attachment.tipo === AttachmentType.LINK) {
        const link = safeLink(attachment.url);
        if (!link)
          throw new BadRequestException(
            'Link inseguro ou temporário: corrija o anexo antes de criar a versão.',
          );
        files.push({
          attachmentId: attachment.id,
          tipo: attachment.tipo,
          nome: attachment.nome,
          storageKey: null,
          linkUrl: link,
          sha256: null,
        });
      } else {
        const source = this.storage.requireOwnedAttachmentKey(
          attachment.url,
          area.userId,
          area.id,
        );
        const bytes = await this.storage.readObject(source);
        const key = `revisions/${area.userId}/${area.id}/${revisionId}/${attachment.id}`;
        // Record before upload, so failures also attempt compensation.
        createdKeys.push(key);
        await this.storage.upload({
          bucket: this.storage.getBucket(),
          key,
          body: bytes,
          contentType:
            (await fromBuffer(bytes))?.mime ?? 'application/octet-stream',
        });
        files.push({
          attachmentId: attachment.id,
          tipo: attachment.tipo,
          nome: attachment.nome,
          storageKey: key,
          linkUrl: null,
          sha256: fingerprintBytes(bytes),
        });
      }
    }
    return files;
  }

  private async compensate(keys: string[]) {
    for (const key of keys) {
      try {
        await this.storage.delete({ bucket: this.storage.getBucket(), key });
      } catch {
        this.logger.error(`Falha de compensação de objeto F7: ${key}`);
      }
    }
  }

  private async lockAndCheck(tx: Prisma.TransactionClient, area: Captured) {
    await tx.$queryRaw`SELECT "id" FROM "Area" WHERE "id" = ${area.id} AND "userId" = ${area.userId} FOR UPDATE`;
    const fresh = await tx.area.findFirst({
      where: { id: area.id, userId: area.userId, deletedAt: null },
      include: includeFiles,
    });
    if (!fresh || fingerprint(fresh) !== fingerprint(area))
      throw new ConflictException({
        code: 'VERSION_CONFLICT',
        message:
          'A página ou seus anexos mudaram durante a captura. Tente novamente.',
      });
  }

  private revisionData(
    area: Captured,
    id: string,
    name: string,
    files: FileInput[],
  ) {
    return {
      id,
      areaId: area.id,
      name,
      sourceUpdatedAt: area.updatedAt,
      document: area.conteudo === null ? Prisma.JsonNull : area.conteudo,
      metadata: this.metadata(area) as unknown as Prisma.InputJsonValue,
      files: { create: files },
    };
  }

  async list(userId: string, areaId: string) {
    await this.capture(userId, areaId);
    return this.prisma.pageRevision.findMany({
      where: { areaId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        sourceUpdatedAt: true,
        schemaVersion: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  private async ownedRevision(userId: string, areaId: string, id: string) {
    const revision = await this.prisma.pageRevision.findFirst({
      where: { id, areaId, area: { userId, deletedAt: null } },
      include: { files: true },
    });
    if (!revision) throw new NotFoundException('Versão não encontrada.');
    return revision;
  }

  async preview(userId: string, areaId: string, id: string) {
    const revision = await this.ownedRevision(userId, areaId, id);
    return {
      ...revision,
      files: await Promise.all(
        revision.files.map(async (file) => ({
          id: file.id,
          attachmentId: file.attachmentId,
          tipo: file.tipo,
          nome: file.nome,
          url: file.storageKey
            ? await this.storage.signUrl({
                bucket: this.storage.getBucket(),
                key: file.storageKey,
              })
            : file.linkUrl,
        })),
      ),
    };
  }

  async create(userId: string, areaId: string, dto: CreateRevisionDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Informe o nome da versão.');
    const area = await this.capture(userId, areaId);
    this.checkToken(area, dto.updatedAt);
    const id = randomUUID(),
      keys: string[] = [];
    try {
      const files = await this.copyFiles(area, id, keys);
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAndCheck(tx, area);
        const revision = await tx.pageRevision.create({
          data: this.revisionData(area, id, name, files),
        });
        return {
          id: revision.id,
          name: revision.name,
          createdAt: revision.createdAt,
          sourceUpdatedAt: revision.sourceUpdatedAt,
          schemaVersion: revision.schemaVersion,
        };
      });
    } catch (error) {
      await this.compensate(keys);
      throw error;
    }
  }

  async restore(
    userId: string,
    areaId: string,
    revisionId: string,
    dto: RevisionTokenDto,
  ) {
    const revision = await this.ownedRevision(userId, areaId, revisionId);
    const area = await this.capture(userId, areaId);
    this.checkToken(area, dto.updatedAt);
    if (revision.schemaVersion !== 1)
      throw new BadRequestException('Formato de versão não suportado.');
    requireKnownDocument(area.conteudo);
    requireKnownDocument(revision.document);
    assertAttachmentReferences(
      revision.document,
      (revision.metadata as unknown as Metadata).coverAttachmentId,
      new Set(revision.files.map((file) => file.attachmentId)),
    );
    const keys: string[] = [],
      backupId = randomUUID();
    try {
      const backupFiles = await this.copyFiles(area, backupId, keys);
      const ids = new Map<string, string>();
      const attachments: Prisma.AttachmentCreateManyInput[] = [];
      for (const file of revision.files) {
        const id = randomUUID();
        ids.set(file.attachmentId, id);
        let url = file.linkUrl ?? '';
        if (file.storageKey) {
          const bytes = await this.storage.readObject(file.storageKey);
          if (fingerprintBytes(bytes) !== file.sha256)
            throw new BadRequestException(
              'Integridade da mídia da versão inválida.',
            );
          const key = `${userId}/${areaId}/${id}`;
          keys.push(key);
          await this.storage.upload({
            bucket: this.storage.getBucket(),
            key,
            body: bytes,
            contentType:
              (await fromBuffer(bytes))?.mime ?? 'application/octet-stream',
          });
          url = this.storage.buildPublicUrlFromKey(key);
        }
        attachments.push({ id, areaId, tipo: file.tipo, nome: file.nome, url });
      }
      const metadata = revision.metadata as unknown as Metadata;
      return await this.prisma.$transaction(async (tx) => {
        await this.lockAndCheck(tx, area);
        await tx.pageRevision.create({
          data: this.revisionData(
            area,
            backupId,
            `Antes de restaurar: ${revision.name}`.slice(0, 120),
            backupFiles,
          ),
        });
        if (attachments.length)
          await tx.attachment.createMany({ data: attachments });
        const [updated] = await tx.area.updateManyAndReturn({
          where: {
            id: areaId,
            userId,
            updatedAt: new Date(dto.updatedAt),
            deletedAt: null,
          },
          data: {
            nome: metadata.nome,
            categoria: metadata.categoria,
            subSection: metadata.subSection,
            nivelEntendimento: metadata.nivelEntendimento,
            icone: metadata.icone,
            coverPosition: metadata.coverPosition,
            fullWidth: metadata.fullWidth,
            coverAttachmentId: metadata.coverAttachmentId
              ? (ids.get(metadata.coverAttachmentId) ?? null)
              : null,
            conteudo: remapAttachments(revision.document, ids),
            updatedAt: new Date(
              Math.max(Date.now(), area.updatedAt.getTime() + 1),
            ),
          },
        });
        if (!updated)
          throw new ConflictException('A página mudou durante a restauração.');
        return updated;
      });
    } catch (error) {
      await this.compensate(keys);
      throw error;
    }
  }
}

export const fingerprintBytes = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
