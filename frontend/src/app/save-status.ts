export type SavePresentation = { text: string; pending: boolean };

// Presentation only: persistence and the F7 save queue retain their contracts.
export function getSavePresentation(state: {
  isNew: boolean; saving: boolean; autosaving: boolean;
  contentDirty: boolean; metadataDirty: boolean; error?: string;
}): SavePresentation {
  if (state.error) return { text: 'Atenção — revise o aviso de erro', pending: true };
  if (state.saving) return { text: 'Salvando página…', pending: true };
  if (state.isNew) return { text: 'Página ainda não criada', pending: true };
  if (state.autosaving) return { text: 'Salvando página…', pending: true };
  if (state.contentDirty) return { text: 'Alterações pendentes', pending: true };
  if (state.metadataDirty) return { text: 'Conteúdo salvo · propriedades pendentes', pending: true };
  return { text: 'Salvo', pending: false };
}
