import { BadRequestException } from '@nestjs/common';
import {
  getContentDisposition,
  validateDetectedMimeType,
  validateFileHeaderAndExtension,
} from './file-validation.util';

describe('file-validation.util', () => {
  describe('validateFileHeaderAndExtension', () => {
    it('throws BadRequestException if mimetype is missing', () => {
      expect(() =>
        validateFileHeaderAndExtension(undefined, 'file.png'),
      ).toThrow(BadRequestException);
    });

    it('rejects SVG files via MIME image/svg+xml', () => {
      expect(() =>
        validateFileHeaderAndExtension('image/svg+xml', 'icon.svg'),
      ).toThrow('Arquivos SVG e HTML não são permitidos');
    });

    it('rejects HTML files via MIME text/html', () => {
      expect(() =>
        validateFileHeaderAndExtension('text/html', 'index.html'),
      ).toThrow('Arquivos SVG e HTML não são permitidos');
    });

    it('rejects SVG extensions even if MIME is falsified', () => {
      expect(() =>
        validateFileHeaderAndExtension('image/png', 'malicious.svg'),
      ).toThrow('Extensão de arquivo ".svg" não é permitida');
    });

    it('rejects HTML extensions even if MIME is falsified', () => {
      expect(() =>
        validateFileHeaderAndExtension('image/png', 'page.html'),
      ).toThrow('Extensão de arquivo ".html" não é permitida');
    });

    it('rejects dangerous executable extensions like .exe, .sh, .js', () => {
      expect(() =>
        validateFileHeaderAndExtension('application/pdf', 'malware.exe'),
      ).toThrow('Extensão de arquivo ".exe" não é permitida');

      expect(() =>
        validateFileHeaderAndExtension('text/plain', 'script.sh'),
      ).toThrow('Extensão de arquivo ".sh" não é permitida');

      expect(() =>
        validateFileHeaderAndExtension('text/plain', 'app.js'),
      ).toThrow('Extensão de arquivo ".js" não é permitida');
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

    it('allows valid image types (PNG, JPEG, GIF, WEBP)', () => {
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
    });

    it('allows valid document types (PDF, DOCX, XLSX, TXT, CSV, ZIP)', () => {
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
        validateFileHeaderAndExtension('application/zip', 'archive.zip'),
      ).not.toThrow();
    });
  });

  describe('validateDetectedMimeType', () => {
    it('rejects detected SVG or HTML mime types', () => {
      expect(() => validateDetectedMimeType('image/svg+xml')).toThrow(
        'Arquivos SVG e HTML não são permitidos',
      );
      expect(() => validateDetectedMimeType('text/html')).toThrow(
        'Arquivos SVG e HTML não são permitidos',
      );
    });

    it('rejects detected unallowed mime types', () => {
      expect(() =>
        validateDetectedMimeType('application/x-executable'),
      ).toThrow(BadRequestException);
    });

    it('allows detected valid mime types', () => {
      expect(() => validateDetectedMimeType('image/png')).not.toThrow();
      expect(() => validateDetectedMimeType('application/pdf')).not.toThrow();
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

    it('returns attachment disposition for SVG if ever evaluated', () => {
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
});
