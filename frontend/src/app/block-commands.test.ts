import { Editor, type JSONContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { editorExtensions } from './extensions';
import { activeDocumentBlock, canConvertBlock, convertDocumentBlock, insertDocumentBlock, matchingBlockTypes, operateDocumentBlock, slashQuery, type BlockType } from './block-commands';

let editor: Editor;
const text = (value: string, marks?: JSONContent['marks']): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text: value, ...(marks ? { marks } : {}) }] });
const create = (content: JSONContent[]) => {
  // Existing documents with persisted identities exercise preservation exactly.
  const identify = (node: JSONContent): JSONContent => ({ ...node, ...(node.type !== 'text' ? { attrs: { ...node.attrs, id: crypto.randomUUID() } } : {}), ...(node.content ? { content: node.content.map(identify) } : {}) });
  content = content.map(identify);
  editor = new Editor({ element: document.createElement('div'), extensions: editorExtensions, content: { type: 'doc', content } });
  // Geometry/scrolling is exercised in Chrome; jsdom provides no layout.
  Object.defineProperty(editor.view, 'scrollToSelection', { value: () => {} });
  editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false));
  return editor;
};
afterEach(() => editor?.destroy());

test('move o bloco inteiro com japonês, tarefas aninhadas, link e atributos; undo/redo conserva JSON e seleção', () => {
  create([text('Antes'), { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [text('日本語', [{ type: 'link', attrs: { href: 'https://example.com/estudo' } }]), { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [text('Filha')] }] }] }] }, { type: 'codeBlock', attrs: { language: 'javascript' }, content: [{ type: 'text', text: 'let x = 1;\n日本語' }] }, { type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: 'H6' }] }]);
  const before = editor.getJSON();
  const pos = editor.state.doc.child(0).nodeSize;
  editor.commands.setNodeSelection(pos);
  const selected = editor.state.selection.content().content.toJSON();
  expect(operateDocumentBlock(editor, 'down')).toBe(true);
  expect(editor.getJSON().content?.[2]).toEqual(before.content?.[1]);
  expect(editor.state.selection.content().content.toJSON()).toEqual(selected);
  expect(editor.commands.undo()).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.redo()).toBe(true);
  expect(operateDocumentBlock(editor, 'up')).toBe(true);
  expect(editor.getJSON()).toEqual(before);
});

test('duplicar e excluir são passos reversíveis e não apagam o bloco seguinte', () => {
  create([text('日本語'), text('Seguinte')]);
  const before = editor.getJSON();
  expect(operateDocumentBlock(editor, 'duplicate')).toBe(true);
  expect(editor.getJSON().content?.[0]).toEqual(before.content?.[0]);
  expect(editor.getJSON().content?.[1].content).toEqual(before.content?.[0].content);
  expect(editor.getJSON().content?.[1].attrs?.id).not.toBe(before.content?.[0].attrs?.id);
  expect(operateDocumentBlock(editor, 'delete')).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  editor.commands.undo();
  expect(editor.getJSON().content).toHaveLength(3);
  editor.commands.undo();
  expect(editor.getJSON()).toEqual(before);
});

test('limites, seleção entre blocos e editor bloqueado não modificam o documento', () => {
  create([text('A'), text('B')]);
  const before = editor.getJSON();
  expect(operateDocumentBlock(editor, 'up')).toBe(false);
  editor.commands.setTextSelection({ from: 1, to: 5 });
  expect(activeDocumentBlock(editor.state)).toBeNull();
  expect(operateDocumentBlock(editor, 'duplicate')).toBe(false);
  expect(insertDocumentBlock(editor, 'h2')).toBe(false);
  editor.commands.setTextSelection(4);
  expect(operateDocumentBlock(editor, 'down')).toBe(false);
  editor.setEditable(false);
  expect(operateDocumentBlock(editor, 'delete')).toBe(false);
  expect(editor.getJSON()).toEqual(before);
});

test.each(['paragraph', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bulletList', 'orderedList', 'taskList', 'codeBlock', 'blockquote', 'callout', 'toggleBlock', 'horizontalRule'] as BlockType[])('insere %s removendo somente o parágrafo de comando; undo recupera a barra', type => {
  create([text('Intacto'), text('/titulo')]);
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  const before = editor.getJSON();
  expect(insertDocumentBlock(editor, type, true)).toBe(true);
  expect(editor.getJSON().content?.[0]).toEqual(before.content?.[0]);
  expect(editor.getText()).not.toContain('/titulo');
  editor.commands.undo();
  expect(editor.getJSON()).toEqual(before);
});

test('slash ignora código, texto normal, seleção e listas; pesquisa ignora acentos', () => {
  create([text('Texto /codigo'), { type: 'codeBlock', content: [{ type: 'text', text: '/codigo' }] }, text('/citação')]);
  expect(slashQuery(editor.state)).toBeNull();
  editor.commands.setTextSelection(editor.state.doc.child(0).nodeSize + 3);
  expect(slashQuery(editor.state)).toBeNull();
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  expect(slashQuery(editor.state)?.query).toBe('citação');
  expect(matchingBlockTypes('citação').map(type => type.id)).toEqual(['blockquote']);
  editor.commands.setTextSelection({ from: editor.state.doc.content.size - 3, to: editor.state.doc.content.size - 1 });
  expect(slashQuery(editor.state)).toBeNull();
});

test('converte preservando links, marcas e seleção invertida; recusa código que descartaria marcas', () => {
  create([text('日本語 e link', [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://example.com' } }])]);
  const before = editor.getJSON();
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 5, 2)));
  expect(canConvertBlock(editor.state, 'codeBlock')).toBe(false);
  expect(convertDocumentBlock(editor, 'codeBlock')).toBe(false);
  expect(convertDocumentBlock(editor, 'taskList')).toBe(true);
  const converted: JSONContent = editor.getJSON();
  expect(converted.content?.[0].content?.[0].content?.[0].content).toEqual(before.content?.[0].content);
  expect(editor.state.selection.anchor - editor.state.selection.head).toBe(3);
  expect(convertDocumentBlock(editor, 'paragraph')).toBe(false);
  editor.commands.undo();
  expect(editor.getJSON()).toEqual(before);
});

test('inserir após o bloco não substitui texto selecionado e mantém o histórico separado da digitação', () => {
  create([text('Selecionado')]);
  const before = editor.getJSON();
  editor.commands.setTextSelection({ from: 1, to: 5 });
  expect(insertDocumentBlock(editor, 'h2')).toBe(true);
  editor.commands.insertContent('Novo');
  editor.commands.undo();
  expect(editor.getJSON().content?.[1].type).toBe('heading');
  editor.commands.undo();
  expect(editor.getJSON()).toEqual(before);
});

test('composição ativa não executa inserção, conversão ou operações', () => {
  create([text('/codigo')]);
  const before = editor.getJSON();
  editor.commands.setTextSelection(8);
  Object.defineProperty(editor.view, 'composing', { get: () => true });
  expect(insertDocumentBlock(editor, 'codeBlock', true)).toBe(false);
  expect(convertDocumentBlock(editor, 'h2')).toBe(false);
  expect(operateDocumentBlock(editor, 'duplicate')).toBe(false);
  expect(editor.getJSON()).toEqual(before);
});

test('alternante usa atributos atuais, renomeia por botão/F2 e desfaz cada ação separadamente', () => {
  create([{ type: 'toggleBlock', attrs: { summary: 'Original', open: true }, content: [text('日本語')] }]);
  const prompt = jest.spyOn(window, 'prompt').mockReturnValueOnce('Primeiro').mockReturnValueOnce('Segundo');
  const summary = editor.view.dom.querySelector('summary')!;
  const button = editor.view.dom.querySelector<HTMLButtonElement>('.toggle-rename')!;
  button.click();
  summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
  expect(prompt).toHaveBeenLastCalledWith('Título do alternante:', 'Primeiro');
  expect(editor.state.doc.child(0).attrs.summary).toBe('Segundo');
  editor.commands.undo();
  expect(editor.state.doc.child(0).attrs.summary).toBe('Primeiro');
  const details = editor.view.dom.querySelector('details')!;
  details.open = false; details.dispatchEvent(new Event('toggle'));
  expect(editor.state.doc.child(0).attrs.open).toBe(false);
  expect(editor.state.doc.child(0).attrs.summary).toBe('Primeiro');
  editor.commands.undo();
  details.dispatchEvent(new Event('toggle'));
  expect(editor.state.doc.child(0).attrs.open).toBe(true);
  prompt.mockRestore();
});
