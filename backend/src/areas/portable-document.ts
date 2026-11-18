import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Node[];
  content?: Node[];
};
const nodes = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'blockquote',
  'codeBlock',
  'hardBreak',
  'horizontalRule',
  'toggleBlock',
  'callout',
  'image',
  'attachment',
  'pageReference',
]);
const marks = new Set([
  'bold',
  'italic',
  'strike',
  'underline',
  'code',
  'link',
  'highlight',
  'textStyle',
]);

export function knownDocument(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (
    !Object.keys(obj).length ||
    (typeof obj.texto === 'string' && Object.keys(obj).length === 1)
  )
    return true;
  if (
    obj.type !== 'doc' ||
    (obj.schemaVersion !== undefined && obj.schemaVersion !== 1)
  )
    return false;
  const visit = (node: Node, depth: number): boolean => {
    if (
      !node ||
      typeof node !== 'object' ||
      depth > 100 ||
      !nodes.has(node.type ?? '')
    )
      return false;
    if (node.text !== undefined && typeof node.text !== 'string') return false;
    if (
      node.marks &&
      (!Array.isArray(node.marks) ||
        node.marks.some(
          (mark) =>
            !mark || typeof mark !== 'object' || !marks.has(mark.type ?? ''),
        ))
    )
      return false;
    return (
      !node.content ||
      (Array.isArray(node.content) &&
        node.content.every((child) => visit(child, depth + 1)))
    );
  };
  return visit(value, 0);
}

export function requireKnownDocument(value: unknown) {
  if (!knownDocument(value))
    throw new UnprocessableEntityException({
      code: 'UNSUPPORTED_DOCUMENT_SCHEMA',
      message:
        'Formato desconhecido. O original foi preservado; exporte o JSON antes de converter.',
    });
}

export function remapAttachments(
  value: Prisma.JsonValue,
  ids: Map<string, string>,
): Prisma.InputJsonValue {
  const walk = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(walk);
    if (!item || typeof item !== 'object') return item;
    return Object.fromEntries(
      Object.entries(item).map(([key, val]) => [
        key,
        key === 'attachmentId' && typeof val === 'string'
          ? (ids.get(val) ?? val)
          : walk(val),
      ]),
    );
  };
  return walk(value) as Prisma.InputJsonValue;
}

export function safeLink(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (
      !['https:', 'http:', 'mailto:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    )
      return null;
    if (
      [...parsed.searchParams.keys()].some((key) =>
        /token|secret|signature|credential|^x-amz-|^x-goog-/i.test(key),
      )
    )
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// Keep unknown JSON losslessly; strip only temporary authentication in recognized URLs.
export function portableJson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(portableJson);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, portableJson(val)]),
    );
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return value;
    }
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()])
      if (/token|secret|signature|credential|^x-amz-|^x-goog-/i.test(key))
        url.searchParams.delete(key);
    return url.toString();
  }
  return value;
}

export function assertAttachmentReferences(
  document: unknown,
  coverId: string | null,
  attachments: Set<string>,
) {
  const visit = (value: unknown, depth = 0) => {
    if (!value || typeof value !== 'object') return;
    if (depth > 100)
      throw new UnprocessableEntityException(
        'Documento excede a profundidade suportada.',
      );
    for (const [key, item] of Object.entries(value)) {
      if (
        key === 'attachmentId' &&
        typeof item === 'string' &&
        !attachments.has(item)
      )
        throw new UnprocessableEntityException(
          'Documento referencia um anexo ausente ou de outra página.',
        );
      visit(item, depth + 1);
    }
  };
  if (coverId && !attachments.has(coverId))
    throw new UnprocessableEntityException(
      'Capa referencia um anexo ausente ou de outra página.',
    );
  visit(document);
}

const scalar = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const escape = (text: unknown) =>
  scalar(text ?? '').replace(/[\\`*_[\]<>#]/g, '\\$&');
export function markdown(
  document: unknown,
  files: Map<string, string>,
  pages: Set<string>,
  limitations: Set<string>,
): string {
  if (document && typeof document === 'object' && 'texto' in document)
    return escape(document.texto);
  const render = (node: Node, depth = 0): string => {
    if (!node || typeof node !== 'object') {
      limitations.add('Conteúdo não reconhecido preservado no JSON.');
      return '';
    }
    if (depth > 100) {
      limitations.add('Documento profundo: consultar JSON.');
      return '';
    }
    const children = Array.isArray(node.content) ? node.content : [];
    const inner = () =>
      children.map((child) => render(child, depth + 1)).join('');
    const attrs = node.attrs ?? {};
    switch (node.type) {
      case 'text': {
        let text = escape(node.text);
        for (const mark of Array.isArray(node.marks)
          ? node.marks.filter((mark) => mark && typeof mark === 'object')
          : []) {
          if (mark.type === 'bold') text = `**${text}**`;
          else if (mark.type === 'italic') text = `*${text}*`;
          else if (mark.type === 'strike') text = `~~${text}~~`;
          else if (mark.type === 'link') {
            const href = safeLink(mark.attrs?.href);
            if (href)
              text = `[${text}](${encodeURI(href).replace(/[()]/g, encodeURIComponent)})`;
            else
              limitations.add(
                'Link inseguro ou temporário omitido do Markdown.',
              );
          } else if (mark.type === 'code') {
            const fence = '`'.repeat(
              Math.max(
                1,
                ...(node.text?.match(/`+/g) ?? []).map((s) => s.length + 1),
              ),
            );
            text = `${fence} ${node.text ?? ''} ${fence}`;
          } else limitations.add(`Formatação ${mark.type} preservada no JSON.`);
        }
        return text;
      }
      case 'doc':
        return inner();
      case 'paragraph':
        return `${inner()}\n\n`;
      case 'heading':
        return `${'#'.repeat(Math.min(6, Math.max(1, Number(attrs.level) || 1)))} ${inner()}\n\n`;
      case 'hardBreak':
        return '  \n';
      case 'horizontalRule':
        return '\n---\n\n';
      case 'codeBlock': {
        const raw = children
          .map((child) =>
            child && typeof child.text === 'string' ? child.text : '',
          )
          .join('');
        const fence = '`'.repeat(
          Math.max(3, ...(raw.match(/`+/g) ?? []).map((s) => s.length + 1)),
        );
        const language = scalar(attrs.language ?? '').replace(
          /[^a-zA-Z0-9_+-]/g,
          '',
        );
        return `${fence}${language}\n${raw}\n${fence}\n\n`;
      }
      case 'bulletList':
      case 'taskList':
        return `${inner()}\n`;
      case 'orderedList':
        return (
          children
            .map(
              (child, i) =>
                `${i + 1}. ${render(child, depth + 1)
                  .replace(/^- /, '')
                  .trim()}\n`,
            )
            .join('') + '\n'
        );
      case 'listItem':
        return `- ${inner().trim().replace(/\n/g, '\n  ')}\n`;
      case 'taskItem':
        return `- [${attrs.checked ? 'x' : ' '}] ${inner().trim().replace(/\n/g, '\n  ')}\n`;
      case 'blockquote':
      case 'callout':
        return (
          inner()
            .trim()
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n') + '\n\n'
        );
      case 'toggleBlock':
        limitations.add('Alternantes são expandidos no Markdown.');
        return `### ${escape(attrs.summary ?? 'Alternante')}\n\n${inner()}`;
      case 'image':
      case 'attachment': {
        const file = files.get(scalar(attrs.attachmentId));
        if (!file) {
          limitations.add(
            `Mídia não resolvida: ${scalar(attrs.attachmentId ?? '')}`,
          );
          return '[Mídia indisponível]\n\n';
        }
        return `${node.type === 'image' ? '!' : ''}[${escape(attrs.alt ?? attrs.name ?? 'Arquivo')}](${file})\n\n`;
      }
      case 'pageReference': {
        const id = scalar(attrs.targetPageId);
        return pages.has(id)
          ? `[Página](../${id}/page.md)`
          : '[Página fora do pacote]';
      }
      default:
        limitations.add(`Bloco ${String(node.type)} preservado no JSON.`);
        return inner();
    }
  };
  return render(document as Node);
}
