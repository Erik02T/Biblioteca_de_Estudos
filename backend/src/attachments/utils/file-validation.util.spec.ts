import { BadRequestException } from '@nestjs/common';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getContentDisposition,
  isAsfContainer,
  validateBufferSafety,
  validateDetectedMimeType,
  validateFileHeaderAndExtension,
  validateFilePathSafety,
  validateTextFileSafety,
} from './file-validation.util';

describe('file-validation.util', () => {
  describe('validateFileHeaderAndExtension', () => {
    it('throws BadRequestException if mimetype is missing', () => {
      expect(() =>
        validateFileHeaderAndExtension(undefined, 'file.png'),
      ).toThrow(BadRequestException);
    });

    it('allows HTML files via MIME text/html', () => {
      expect(() =>
        validateFileHeaderAndExtension('text/html', 'index.html'),
      ).not.toThrow();
    });

    it('allows SVG files via MIME image/svg+xml', () => {
      expect(() =>
        validateFileHeaderAndExtension('image/svg+xml', 'icon.svg'),
      ).not.toThrow();
    });

    it('rejects dangerous executable extensions like .exe, .sh, .bat', () => {
      expect(() =>
        validateFileHeaderAndExtension('application/pdf', 'malware.exe'),
      ).toThrow('Extensão de arquivo ".exe" não é permitida');

      expect(() =>
        validateFileHeaderAndExtension('text/plain', 'script.sh'),
      ).toThrow('Extensão de arquivo ".sh" não é permitida');

      expect(() =>
        validateFileHeaderAndExtension('text/plain', 'batch.bat'),
      ).toThrow('Extensão de arquivo ".bat" não é permitida');
    });

    it('rejects unallowed MIME types', () => {
      expect(() =>
        validateFileHeaderAndExtension(
          'application/x-shockwave-flash',
          'game.swf',
        ),
      ).toThrow('Tipo MIME "application/x-shockwave-flash" não é permitido');
    });

    it('rejects extension mismatch for allowed MIME types', () => {
      expect(() =>
        validateFileHeaderAndExtension('image/png', 'document.pdf'),
      ).toThrow('Extensão ".pdf" é incompatível com o tipo MIME "image/png"');
    });

    it('allows valid image types (PNG, JPEG, GIF, WEBP, SVG)', () => {
      expect(() =>
        validateFileHeaderAndExtension('image/png', 'photo.png'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('image/jpeg', 'photo.jpg'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('image/jpeg', 'photo.jpeg'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('image/gif', 'animation.gif'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('image/webp', 'image.webp'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('image/svg+xml', 'diagram.svg'),
      ).not.toThrow();
    });

    it('allows valid document types (PDF, DOCX, XLSX, TXT, CSV, HTML, ZIP, MD)', () => {
      expect(() =>
        validateFileHeaderAndExtension('application/pdf', 'doc.pdf'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('text/plain', 'notes.txt'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('text/csv', 'data.csv'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('text/html', 'pagina.html'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('text/markdown', 'readme.md'),
      ).not.toThrow();
      expect(() =>
        validateFileHeaderAndExtension('application/zip', 'archive.zip'),
      ).not.toThrow();
    });
  });

  describe('validateDetectedMimeType', () => {
    it('rejects detected unallowed mime types', () => {
      expect(() =>
        validateDetectedMimeType('application/x-executable'),
      ).toThrow(BadRequestException);
    });

    it('allows detected valid mime types', () => {
      expect(() => validateDetectedMimeType('image/png')).not.toThrow();
      expect(() => validateDetectedMimeType('application/pdf')).not.toThrow();
      expect(() => validateDetectedMimeType('text/html')).not.toThrow();
    });
  });

  describe('getContentDisposition', () => {
    it('returns inline disposition for safe raster images', () => {
      const disposition = getContentDisposition('image/png', 'foto.png');
      expect(disposition).toContain('inline');
      expect(disposition).toContain('filename="foto.png"');
    });

    it('returns attachment disposition for PDF documents', () => {
      const disposition = getContentDisposition(
        'application/pdf',
        'relatorio.pdf',
      );
      expect(disposition).toContain('attachment');
      expect(disposition).toContain('filename="relatorio.pdf"');
    });

    it('returns attachment disposition for HTML to prevent browser script execution', () => {
      const disposition = getContentDisposition('text/html', 'estudo.html');
      expect(disposition).toContain('attachment');
      expect(disposition).toContain('filename="estudo.html"');
    });

    it('returns attachment disposition for SVG if evaluated', () => {
      const disposition = getContentDisposition('image/svg+xml', 'diagram.svg');
      expect(disposition).toContain('attachment');
    });

    it('sanitizes filename and encodes RFC5987 parameter', () => {
      const disposition = getContentDisposition(
        'application/pdf',
        'meu anexo (final).pdf',
      );
      expect(disposition).toContain('filename="meu_anexo__final_.pdf"');
      expect(disposition).toContain(
        "filename*=UTF-8''meu%20anexo%20%28final%29.pdf",
      );
    });
  });

  describe('validateBufferSafety & isAsfContainer', () => {
    const asfGuidHeader = Buffer.from([
      0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00, 0xaa,
      0x00, 0x62, 0xce, 0x6c, 0x00, 0x00, 0x00, 0x00,
    ]);

    it('detects ASF GUID signature correctly', () => {
      expect(isAsfContainer(asfGuidHeader)).toBe(true);
      expect(isAsfContainer(Buffer.from('PNG content'))).toBe(false);
      expect(isAsfContainer(Buffer.alloc(5))).toBe(false);
    });

    it('rejects empty or null buffer', () => {
      expect(() => validateBufferSafety(Buffer.alloc(0))).toThrow(
        BadRequestException,
      );
    });

    it('rejects ASF files before passing to parser to mitigate DoS (GHSA-5v7r-6r5c-r473)', () => {
      expect(() => validateBufferSafety(asfGuidHeader)).toThrow(
        'Formato de arquivo ASF não é suportado',
      );
    });

    it('allows valid non-ASF buffers', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      expect(() => validateBufferSafety(pngBuffer)).not.toThrow();
    });
  });

  describe('disk-backed file validation', () => {
    let directory: string;

    beforeEach(async () => {
      directory = await mkdtemp(join(tmpdir(), 'biblioteca-validation-test-'));
    });

    afterEach(async () => {
      await rm(directory, { recursive: true, force: true });
    });

    it('rejects empty files and ASF signatures without loading the entire file', async () => {
      const emptyFile = join(directory, 'empty');
      const asfFile = join(directory, 'asf');
      await writeFile(emptyFile, Buffer.alloc(0));
      await writeFile(
        asfFile,
        Buffer.from([
          0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11, 0xa6, 0xd9, 0x00,
          0xaa, 0x00, 0x62, 0xce, 0x6c,
        ]),
      );

      await expect(validateFilePathSafety(emptyFile)).rejects.toThrow(
        'Arquivo vazio ou inválido.',
      );
      await expect(validateFilePathSafety(asfFile)).rejects.toThrow(
        'Formato de arquivo ASF não é suportado.',
      );
    });

    it('scans text uploads for binary NUL bytes', async () => {
      const validFile = join(directory, 'valid.txt');
      const invalidFile = join(directory, 'invalid.txt');
      await writeFile(validFile, Buffer.from('notas de estudo'));
      await writeFile(invalidFile, Buffer.from([0x61, 0x00, 0x62]));

      await expect(validateTextFileSafety(validFile)).resolves.toBeUndefined();
      await expect(validateTextFileSafety(invalidFile)).rejects.toThrow(
        'Arquivo de texto contém bytes binários inválidos.',
      );
    });
  });
});
