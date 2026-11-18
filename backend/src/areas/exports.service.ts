import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { zip } from 'fflate';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ExportDto } from './dto/portability.dto';
import {
  assertAttachmentReferences,
  markdown,
  portableJson,
  safeLink,
} from './portable-document';
import { fingerprint, fingerprintBytes } from './revisions.service';

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_PAGES = 500;
@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private capture(userId: string, dto: ExportDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const where = {
          userId,
          ...(dto.includeTrash ? {} : { deletedAt: null }),
        };
        const roots = await tx.area.findMany({
          where: { ...where, id: { in: dto.ids } },
          include: { attachments: { orderBy: { id: 'asc' as const } } },
          orderBy: { id: 'asc' },
        });
        if (roots.length !== new Set(dto.ids).size)
          throw new NotFoundException(
            'Uma das páginas selecionadas não está disponível.',
          );
        const selected = new Map(roots.map((page) => [page.id, page]));
        let pending = roots.map((page) => page.id);
        while (dto.includeChildren && pending.length) {
          const children = await tx.area.findMany({
            where: { ...where, parentId: { in: pending } },
            include: { attachments: { orderBy: { id: 'asc' as const } } },
            orderBy: { id: 'asc' },
          });
          pending = [];
          for (const child of children)
            if (!selected.has(child.id)) {
              selected.set(child.id, child);
              pending.push(child.id);
            }
          if (selected.size > MAX_PAGES)
            throw new PayloadTooLargeException(
              `Exporte até ${MAX_PAGES} páginas por pacote.`,
            );
        }
        return [...selected.values()].sort((a, b) => a.id.localeCompare(b.id));
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async create(userId: string, dto: ExportDto): Promise<Buffer> {
    const pages = await this.capture(userId, dto);
    const entries: Record<string, Uint8Array> = Object.create(null) as Record<
      string,
      Uint8Array
    >;
    let size = 0;
    const add = (path: string, data: string | Buffer) => {
      const bytes = typeof data === 'string' ? Buffer.from(data) : data;
      size += bytes.length;
      if (size > MAX_BYTES)
        throw new PayloadTooLargeException(
          'O pacote ultrapassa 100 MiB. Exporte ramos menores.',
        );
      entries[path] = bytes;
    };
    const ids = new Set(pages.map((page) => page.id));
    const limitations = new Set<string>();
    for (const page of pages) {
      assertAttachmentReferences(
        page.conteudo,
        page.coverAttachmentId,
        new Set(page.attachments.map((file) => file.id)),
      );
      const relativeFiles = new Map<string, string>();
      const files: {
        id: string;
        tipo: string;
        nome: string | null;
        path?: string;
        url?: string;
      }[] = [];
      for (const attachment of page.attachments) {
        if (attachment.tipo === 'LINK') {
          const url = safeLink(attachment.url);
          if (!url)
            throw new BadRequestException(
              'Anexo com link inseguro ou temporário. Corrija antes de exportar.',
            );
          relativeFiles.set(attachment.id, url);
          files.push({
            id: attachment.id,
            tipo: attachment.tipo,
            nome: attachment.nome,
            url,
          });
        } else {
          const key = this.storage.requireOwnedAttachmentKey(
            attachment.url,
            userId,
            page.id,
          );
          const suffix =
            attachment.nome?.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? '';
          const path = `files/${attachment.id}${suffix}`;
          add(
            `pages/${page.id}/${path}`,
            await this.storage.readObject(key, MAX_BYTES - size),
          );
          relativeFiles.set(attachment.id, path);
          files.push({
            id: attachment.id,
            tipo: attachment.tipo,
            nome: attachment.nome,
            path,
          });
        }
      }
      const { userId: _owner, attachments: _attachments, ...data } = page;
      void _owner;
      void _attachments;
      add(
        `pages/${page.id}/page.json`,
        JSON.stringify(
          portableJson({ schemaVersion: 1, page: data, attachments: files }),
          null,
          2,
        ),
      );
      let text =
        `# ${page.nome.replace(/[\r\n]/g, ' ').replace(/[\\`*_[\]<>#]/g, '\\$&')}\n\n` +
        markdown(page.conteudo, relativeFiles, ids, limitations);
      if (page.targetPageId)
        text += ids.has(page.targetPageId)
          ? `\n[Página referenciada](../${page.targetPageId}/page.md)\n`
          : '\nPágina referenciada fora do pacote.\n';
      text +=
        '\n## Materiais\n\n' +
        files
          .map(
            (file) =>
              `${file.tipo === 'IMAGEM' ? '!' : ''}[${(file.nome ?? file.id).replace(/[\\[\]<>]/g, '\\$&')}](${file.path ?? file.url})`,
          )
          .join('\n\n');
      add(`pages/${page.id}/page.md`, text);
    }
    const fresh = await this.capture(userId, dto);
    if (fingerprint(pages) !== fingerprint(fresh))
      throw new ConflictException({
        code: 'EXPORT_CHANGED',
        message:
          'As páginas ou anexos mudaram durante a exportação. Tente novamente.',
      });
    add(
      'README.md',
      '# Biblioteca de Estudos\n\nAbra pages/<ID>/page.md em um leitor Markdown. Os arquivos estão em pastas relativas. O JSON preserva o conteúdo fonte; este pacote não inclui histórico de versões nem permite importação automática. Consulte manifest.json para hierarquia, hashes e limitações.\n',
    );
    add(
      'manifest.json',
      JSON.stringify(
        {
          format: 'biblioteca-de-estudos',
          schemaVersion: 1,
          createdAt: new Date().toISOString(),
          includeTrash: dto.includeTrash ?? false,
          pages: pages.map((page) => ({
            id: page.id,
            parentId: page.parentId,
            sortOrder: page.sortOrder,
            sourceUpdatedAt: page.updatedAt,
            deletedAt: page.deletedAt,
            path: `pages/${page.id}/page.json`,
          })),
          limitations: [...limitations],
          files: Object.entries(entries).map(([path, bytes]) => ({
            path,
            size: bytes.length,
            sha256: fingerprintBytes(Buffer.from(bytes)),
          })),
        },
        null,
        2,
      ),
    );
    return new Promise((resolve, reject) =>
      zip(entries, { level: 6 }, (error, data) =>
        error ? reject(error) : resolve(Buffer.from(data)),
      ),
    );
  }
}
