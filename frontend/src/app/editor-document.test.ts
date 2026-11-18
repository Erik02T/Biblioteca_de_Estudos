import { originalDocumentText, unsupportedEditorFeatures } from './editor-document';

test('F10 aceita mídia, referências legadas e IDs sem alterar o JSON original; bloqueia dados desconhecidos', () => {
  const original = { type: 'doc', content: [{ type: 'image', attrs: { attachmentId: 'image-id' } }, { type: 'attachment', attrs: { attachmentId: 'file-id' } }, { type: 'pageReference', attrs: { pageId: 'page-id' } }, { type: 'paragraph', attrs: { id: 'legacy-block-id' } }] };
  const copy = JSON.stringify(original);
  expect(unsupportedEditorFeatures(original)).toEqual([]);
  expect(JSON.stringify(original)).toBe(copy);
  expect(unsupportedEditorFeatures({ type: 'doc', content: [{ type: 'image', attrs: { attachmentId: 'id', cropUnknown: 0.2 } }, { type: 'unknownNode' }] })).toEqual(['image.cropUnknown', 'unknownNode']);
});

test('aceita os tipos reais do editor e detecta estruturas e marcas incompatíveis', () => {
  const document = { type: 'doc', content: [{ type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: '日本語', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }] }, { type: 'codeBlock', attrs: { language: 'javascript' }, content: [{ type: 'text', text: 'let x = 1;' }] }] };
  expect(unsupportedEditorFeatures(document)).toEqual([]);
  expect(originalDocumentText(document)).toBe('日本語\n\nlet x = 1;');
  expect(unsupportedEditorFeatures({ type: 'doc', content: [{ type: 'text', text: 'Inválido' }] })).toEqual(['structure']);
  expect(unsupportedEditorFeatures({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A', marks: [{ type: 'unsupportedMark' }] }] }] })).toEqual(['unsupportedMark']);
});
