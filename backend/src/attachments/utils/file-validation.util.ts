import { BadRequestException } from '@nestjs/common';

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '.xlsx',
  ],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    '.pptx',
  ],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

export const DISALLOWED_MIME_TYPES = new Set([
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'application/x-sh',
  'application/x-httpd-php',
  'application/x-executable',
  'application/x-msdownload',
]);

export const DISALLOWED_EXTENSIONS = new Set([
  '.svg',
  '.html',
  '.htm',
  '.xhtml',
  '.js',
  '.mjs',
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.php',
  '.phtml',
  '.vbs',
  '.ps1',
  '.jar',
  '.asf',
  '.wmv',
  '.wma',
]);

// ASF Header Object GUID: 30 26 b2 75 8e 66 cf 11 a6 d9 00 aa 00 62 ce 6c
const ASF_HEADER_GUID = Buffer.from([
  0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa, 0x00,
  0x62, 0xce, 0x6c,
]);

export function isAsfContainer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 16) return false;
  return buffer.subarray(0, 16).equals(ASF_HEADER_GUID);
}

export function validateBufferSafety(buffer: Buffer): void {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('Arquivo vazio ou inválido.');
  }
  if (isAsfContainer(buffer)) {
    throw new BadRequestException('Formato de arquivo ASF não é suportado.');
  }
}

export function extractFileExtension(filename: string): string {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot).toLowerCase();
}

export function validateFileHeaderAndExtension(
  mimetype?: string,
  originalname?: string,
): void {
  if (!mimetype) {
    throw new BadRequestException('O arquivo precisa informar o tipo MIME');
  }

  const mime = mimetype.toLowerCase().trim();
  const ext = extractFileExtension(originalname ?? '');

  if (
    DISALLOWED_MIME_TYPES.has(mime) ||
    mime === 'image/svg+xml' ||
    mime === 'text/html'
  ) {
    throw new BadRequestException(
      'Arquivos SVG e HTML não são permitidos devido a riscos de segurança (conteúdo executável).',
    );
  }

  if (DISALLOWED_EXTENSIONS.has(ext)) {
    throw new BadRequestException(
      `Extensão de arquivo "${ext}" não é permitida por razões de segurança.`,
    );
  }

  if (!(mime in ALLOWED_MIME_TYPES)) {
    throw new BadRequestException(
      `Tipo MIME "${mimetype}" não é permitido. Tipos permitidos: imagens (png, jpg, webp, gif) e documentos (pdf, docx, xlsx, pptx, txt, csv, zip).`,
    );
  }

  const allowedExtensions = ALLOWED_MIME_TYPES[mime];
  if (ext && allowedExtensions && !allowedExtensions.includes(ext)) {
    throw new BadRequestException(
      `Extensão "${ext}" é incompatível com o tipo MIME "${mimetype}".`,
    );
  }
}

export function validateDetectedMimeType(detectedMime: string): void {
  const mime = detectedMime.toLowerCase().trim();

  if (
    DISALLOWED_MIME_TYPES.has(mime) ||
    mime === 'image/svg+xml' ||
    mime === 'text/html'
  ) {
    throw new BadRequestException(
      'Arquivos SVG e HTML não são permitidos devido a riscos de segurança (conteúdo executável).',
    );
  }

  if (!(mime in ALLOWED_MIME_TYPES)) {
    throw new BadRequestException(
      `O tipo MIME real do arquivo (${detectedMime}) não é permitido.`,
    );
  }
}

export function getContentDisposition(
  mimetype: string,
  originalname: string,
): string {
  const safeFilename = (originalname || 'file').replace(
    /[^a-zA-Z0-9._-]/g,
    '_',
  );
  const encodedFilename = encodeURIComponent(originalname || 'file')
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');

  const isSafeInlineImage =
    mimetype.toLowerCase().startsWith('image/') &&
    !mimetype.toLowerCase().includes('svg');

  const dispositionType = isSafeInlineImage ? 'inline' : 'attachment';

  return `${dispositionType}; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`;
}
