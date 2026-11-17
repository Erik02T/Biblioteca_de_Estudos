import { editedDocumentContent, getEditorContent, originalDocumentText, unsupportedEditorFeatures } from './editor-document';

test.each([
  { futureFormat: { value: '日本語 preservado' } },
  { texto: 'Texto conhecido', futureMetadata: { value: 42 } },
  { type: 'futureRoot', content: [{ type: 'paragraph' }] },
])('F12: formato de raiz desconhecido permanece bloqueado em vez de virar documento vazio: %j', original => {
  const before = JSON.stringify(original);
  expect(unsupportedEditorFeatures(getEditorContent(original))).not.toEqual([]);
  expect(JSON.stringify(original)).toBe(before);
});

test('F12: legado de texto e documento vazio continuam editáveis', () => {
  expect(originalDocumentText(getEditorContent({ texto: 'Texto 日本語' }))).toBe('Texto 日本語');
  expect(unsupportedEditorFeatures(getEditorContent({}))).toEqual([]);
  expect(unsupportedEditorFeatures(getEditorContent())).toEqual([]);
});

test('F12: versão conhecida pode ser editada sem perder o envelope; versão futura fica bloqueada', () => {
  const original = { type: 'doc', schemaVersion: 1, content: [{ type: 'paragraph' }] };
  expect(unsupportedEditorFeatures(getEditorContent(original))).toEqual([]);
  expect(editedDocumentContent({ type: 'doc', content: [{ type: 'paragraph' }] }, original).schemaVersion).toBe(1);
  expect(unsupportedEditorFeatures(getEditorContent({ ...original, schemaVersion: 999 }))).toContain('schemaVersion');
});

test.each([
  { type: 'doc', content: 'invalid' },
  { type: 'doc', content: [null] },
  { type: 'doc', content: [{ type: 'paragraph', marks: 'invalid' }] },
])('F12: estrutura legada inválida bloqueia edição sem derrubar a tela: %j', document => {
  expect(unsupportedEditorFeatures(getEditorContent(document as never))).toContain('structure');
});
