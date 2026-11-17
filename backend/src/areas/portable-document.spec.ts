import {
  assertAttachmentReferences,
  knownDocument,
  markdown,
  portableJson,
  safeLink,
} from './portable-document';

describe('F7 — conteúdo portátil', () => {
  it('exporta JSON legado irregular sem tentar normalizar o original', () => {
    const limitations = new Set<string>();
    expect(markdown(null, new Map(), new Set(), limitations)).toBe('');
    expect(
      markdown(
        { type: 'future', content: 7 },
        new Map(),
        new Set(),
        limitations,
      ),
    ).toBe('');
    expect(
      knownDocument({
        type: 'doc',
        content: [{ type: 'text', text: 'x', marks: [null] }],
      }),
    ).toBe(false);
    expect(limitations.size).toBeGreaterThan(0);
  });
  it('preserva timestamps e JSON desconhecido sem credenciais em URLs', () => {
    expect(
      portableJson({
        updatedAt: new Date('2026-11-13T12:00:00Z'),
        type: 'futureBlock',
        url: 'https://user:password@example.com/a?X-Amz-Signature=secret&view=1',
        raw: 'http://[',
      }),
    ).toEqual({
      updatedAt: '2026-11-13T12:00:00.000Z',
      type: 'futureBlock',
      url: 'https://example.com/a?view=1',
      raw: 'http://[',
    });
  });
  it('rejeita referências de mídia ausentes ou de outra página', () => {
    expect(() =>
      assertAttachmentReferences(
        { type: 'image', attrs: { attachmentId: 'foreign' } },
        null,
        new Set(['own']),
      ),
    ).toThrow('anexo ausente');
    expect(() => assertAttachmentReferences({}, 'foreign', new Set())).toThrow(
      'Capa',
    );
  });
  it('não converte links perigosos em conteúdo executável', () => {
    expect(safeLink('javascript:alert(1)')).toBeNull();
    expect(safeLink('https://example.com?token=private')).toBeNull();
    const limitations = new Set<string>();
    const text = markdown(
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '<script>alert(1)</script>',
            marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
          },
        ],
      },
      new Map(),
      new Set(),
      limitations,
    );
    expect(text).not.toContain('<script>');
    expect(text).not.toContain('javascript:');
    expect(limitations.size).toBe(1);
  });
  it('preserva legado e recusa schema futuro ou profundidade excessiva para escrita', () => {
    expect(knownDocument({ texto: '日本語' })).toBe(true);
    expect(knownDocument({ type: 'doc', schemaVersion: 2 })).toBe(false);
    expect(knownDocument({ type: 'doc', content: [{ type: 'future' }] })).toBe(
      false,
    );
    let content: object = { type: 'paragraph' };
    for (let i = 0; i < 105; i++)
      content = { type: 'blockquote', content: [content] };
    expect(knownDocument({ type: 'doc', content: [content] })).toBe(false);
  });
});
