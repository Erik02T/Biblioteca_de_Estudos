import { getSavePresentation } from './save-status';

const saved = { isNew: false, saving: false, autosaving: false, contentDirty: false, metadataDirty: false };
test('autosave do conteúdo não oculta propriedades pendentes', () => {
  expect(getSavePresentation({ ...saved, autosaving: true, metadataDirty: true }).text).toBe('Salvando página…');
  expect(getSavePresentation({ ...saved, metadataDirty: true }).text).toContain('propriedades pendentes');
});
test('rascunho vazio e falha nunca indicam sucesso', () => {
  expect(getSavePresentation({ ...saved, isNew: true }).pending).toBe(true);
  expect(getSavePresentation({ ...saved, error: 'Conflito — recarregue a versão atual.' })).toEqual({ text: 'Atenção — revise o aviso de erro', pending: true });
});
