import { Editor, type JSONContent } from '@tiptap/core';
import { waitFor } from '@testing-library/react';
import { editorExtensions } from './extensions';
import { activeDocumentBlock, convertDocumentBlock, insertDocumentBlock, moveDocumentBlock, operateDocumentBlock, selectParentBlock, slashQuery } from './block-commands';
import { DocumentInsertion } from './document-insertion';
import { configureDocumentResources, createDocumentResources } from './document-resources';
import { normalizeEditorDocument } from './document-normalize';

let editor: Editor;
const paragraph = (text: string): JSONContent => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] });
function create(content: JSONContent[]) {
  editor = new Editor({ element: document.createElement('div'), extensions: editorExtensions, content: { type: 'doc', content } });
  Object.defineProperty(editor.view, 'scrollToSelection', { value: () => {} });
  return editor;
}
function pos(text: string) {
  let found = -1;
  editor.state.doc.descendants((node, position) => { if (node.isText && node.text === text) found = position; });
  if (found < 0) throw Error('Fixture text missing: ' + text);
  return found;
}
afterEach(() => { editor?.destroy(); jest.restoreAllMocks(); });

test('F12: renomear alternante é uma ação separada do summary e preserva conteúdo recolhido', () => {
  create([{ type: 'toggleBlock', attrs: { summary: 'Exemplos', open: false }, content: [paragraph('日本語 preservado')] }]);
  const toggle = editor.view.dom.querySelector('details')!;
  const rename = editor.view.dom.querySelector<HTMLButtonElement>('.toggle-rename')!;
  expect(toggle.querySelector('summary button')).toBeNull();
  expect(rename.closest('details')).toBeNull();
  const prompt = jest.spyOn(window, 'prompt').mockReturnValue('Novo título');
  rename.click();
  expect(prompt).toHaveBeenCalled();
  expect(editor.getJSON().content?.[0]).toMatchObject({ attrs: { summary: 'Novo título', open: false }, content: [paragraph('日本語 preservado')] });
});

test('move itens entre listas, remove lista vazia e preserva seleção invertida, tarefas e filhos', () => {
  create([{ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [paragraph('日本語'), { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [paragraph('Filha')] }] }] }] }, paragraph('Entre'), { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [paragraph('Destino')] }] }]);
  editor.commands.setTextSelection({ from: pos('日本語') + 2, to: pos('日本語') });
  const originalCount = editor.state.doc.childCount;
  const source = activeDocumentBlock(editor.state)!;
  const item = structuredClone(source.node.toJSON());
  const target = editor.state.doc.child(0).nodeSize + editor.state.doc.child(1).nodeSize + 1;
  expect(moveDocumentBlock(editor, source.pos, target)).toBe(true);
  expect(editor.state.doc.childCount).toBe(originalCount - 1);
  expect(editor.state.doc.child(1).child(0).attrs.checked).toBe(true);
  expect(editor.state.doc.child(1).child(0).textContent).toBe('日本語Filha');
  expect(editor.state.selection.anchor - editor.state.selection.head).toBe(2);
  expect(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)).toBe('日本');
  expect(editor.commands.undo()).toBe(true);
  expect(editor.state.doc.childCount).toBe(originalCount);
  expect(editor.state.doc.child(0).child(0).toJSON()).toEqual(item);
});

test('opera bloco interno, seleciona grupo pai, recusa mover para a própria subárvore e mantém mídia', () => {
  create([{ type: 'toggleBlock', content: [paragraph('Primeiro'), paragraph('Segundo'), { type: 'image', attrs: { attachmentId: 'stable-media' } }] }, paragraph('Fora')]);
  editor.commands.setTextSelection(pos('Segundo'));
  expect(activeDocumentBlock(editor.state)?.node.textContent).toBe('Segundo');
  expect(operateDocumentBlock(editor, 'up')).toBe(true);
  expect(editor.state.doc.child(0).child(0).textContent).toBe('Segundo');
  expect(selectParentBlock(editor)).toBe(true);
  expect(activeDocumentBlock(editor.state)?.node.type.name).toBe('toggleBlock');
  const before = editor.getJSON();
  expect(moveDocumentBlock(editor, 0, 1)).toBe(false);
  expect(convertDocumentBlock(editor, 'paragraph')).toBe(false);
  expect(editor.getJSON()).toEqual(before);
  expect(operateDocumentBlock(editor, 'duplicate')).toBe(true);
  expect(activeDocumentBlock(editor.state)?.node.type.name).toBe('toggleBlock');
  const ids: string[] = [];
  editor.state.doc.descendants(node => { if (node.attrs.id) ids.push(node.attrs.id); });
  expect(new Set(ids).size).toBe(ids.length);
  expect(editor.state.doc.child(1).child(2).attrs.attachmentId).toBe('stable-media');
});

test('abrir não gera IDs nem salva; primeira edição gera IDs; undo/redo preserva conteúdo', async () => {
  const update = jest.fn();
  create([paragraph('Legado'), paragraph('Outro')]);
  editor.on('update', update);
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(update).not.toHaveBeenCalled();
  expect(editor.state.doc.child(0).attrs.id).toBeNull();
  editor.commands.setTextSelection(pos('Legado') + 1);
  editor.commands.insertContent('!');
  expect(editor.state.doc.child(0).attrs.id).toEqual(expect.any(String));
  expect(editor.state.doc.child(1).attrs.id).toEqual(expect.any(String));
  editor.commands.undo();
  expect(editor.getText()).toBe('Legado\n\nOutro');
  editor.commands.redo();
  expect(editor.getText()).toBe('L!egado\n\nOutro');
});

test('duplicar grupo selecionado e desfazer conserva o grupo original e sua identidade', () => {
  create([paragraph('Antes'), { type: 'toggleBlock', attrs: { open: true, summary: 'Exemplos' }, content: [paragraph('Dentro um'), paragraph('Dentro dois')] }, paragraph('Depois')]);
  editor.commands.setTextSelection(pos('Dentro dois'));
  // Establish persisted identities before taking the snapshot.
  editor.commands.insertContent('!'); editor.commands.setTextSelection(pos('Dentro um'));
  expect(selectParentBlock(editor)).toBe(true);
  const before = structuredClone(editor.getJSON());
  expect(operateDocumentBlock(editor, 'duplicate')).toBe(true);
  expect(activeDocumentBlock(editor.state)?.node.type.name).toBe('toggleBlock');
  expect(editor.commands.undo()).toBe(true);
  expect(editor.getJSON()).toEqual(before);
});

test('slash dentro de alternante insere sem alterar os blocos vizinhos', () => {
  create([{ type: 'callout', content: [paragraph('Antes'), paragraph('/codigo'), paragraph('Depois')] }]);
  editor.commands.setTextSelection(pos('/codigo') + 7);
  expect(slashQuery(editor.state)?.query).toBe('codigo');
  expect(insertDocumentBlock(editor, 'codeBlock', true)).toBe(true);
  expect(editor.state.doc.child(0).child(1).type.name).toBe('codeBlock');
  expect(editor.state.doc.child(0).child(2).textContent).toBe('Depois');
});

test('slash e + inserem código dentro de item sem remover o parágrafo obrigatório da lista', () => {
  create([{ type: 'bulletList', content: [{ type: 'listItem', content: [paragraph('/codigo')] }] }]);
  editor.commands.setTextSelection(pos('/codigo') + 7);
  expect(insertDocumentBlock(editor, 'codeBlock', true)).toBe(true);
  expect(editor.state.doc.child(0).child(0).child(0).type.name).toBe('paragraph');
  expect(editor.state.doc.child(0).child(0).child(0).textContent).toBe('');
  expect(editor.state.doc.child(0).child(0).child(1).type.name).toBe('codeBlock');
  editor.commands.undo();
  expect(editor.state.doc.child(0).child(0).textContent).toBe('/codigo');
  expect(insertDocumentBlock(editor, 'codeBlock')).toBe(true);
  expect(editor.state.doc.child(0).child(0).child(0).textContent).toBe('/codigo');
  editor.state.doc.check();
});

test('picker acompanha edição anterior; cancelar ou destruir impede resposta tardia; slash alterado é preservado', () => {
  create([paragraph('Antes'), paragraph('/imagem')]);
  editor.commands.setTextSelection(pos('/imagem') + 7);
  const insertion = new DocumentInsertion(editor, true);
  editor.commands.setTextSelection(pos('Antes')); editor.commands.insertContent('Novo ');
  expect(insertion.insert({ type: 'image', attrs: { attachmentId: 'stable' } })).toBe(true);
  expect(editor.state.doc.child(0).textContent).toBe('Novo Antes');
  expect(editor.state.doc.child(1).attrs.attachmentId).toBe('stable');
  expect(insertion.insert(paragraph('Não inserir'))).toBe(false);
  editor.commands.insertContentAt(editor.state.doc.content.size, paragraph('/pagina'));
  editor.commands.setTextSelection(pos('/pagina') + 7);
  const changed = new DocumentInsertion(editor, true);
  editor.commands.insertContent(' mudou');
  const before = editor.getJSON();
  expect(changed.insert(paragraph('Errado'))).toBe(false);
  expect(editor.getJSON()).toEqual(before); changed.dispose();
  const canceled = new DocumentInsertion(editor); canceled.dispose();
  expect(canceled.insert(paragraph('Errado'))).toBe(false);
});

test('referências inline e em parágrafo próprio preservam texto e undo; normalização não muda original', () => {
  const original = { type: 'doc', content: [{ type: 'pageReference', attrs: { pageId: 'target' } }] };
  const copy = JSON.stringify(original);
  expect(normalizeEditorDocument(original)).toEqual({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'pageReference', attrs: { targetPageId: 'target' } }] }] });
  expect(JSON.stringify(original)).toBe(copy);
  create([paragraph('Teoria e exemplos')]);
  editor.commands.setTextSelection(pos('Teoria e exemplos') + 7);
  expect(new DocumentInsertion(editor).insert({ type: 'pageReference', attrs: { targetPageId: 'target' } }, true)).toBe(true);
  expect(editor.state.doc.child(0).child(1).attrs.targetPageId).toBe('target');
  expect(editor.state.doc.child(0).textContent).toBe('Teoria e exemplos');
  expect(new DocumentInsertion(editor).insert({ type: 'paragraph', content: [{ type: 'pageReference', attrs: { targetPageId: 'another' } }] })).toBe(true);
  expect(editor.state.doc.childCount).toBe(2);
  editor.commands.undo(); expect(editor.state.doc.childCount).toBe(1);
});

test('código: linguagem antiga, indentação, cópia fiel e negada têm feedback sem executar código', async () => {
  const code = '  const exemplo = "日本語";\n\talert("não executar");';
  create([{ type: 'codeBlock', attrs: { language: 'old-language' }, content: [{ type: 'text', text: code }] }]);
  const select = editor.view.dom.querySelector('select')!;
  expect(select.selectedOptions[0].text).toBe('Texto simples (old-language)');
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  editor.view.dom.querySelector('button')!.click();
  await waitFor(() => expect(editor.view.dom.textContent).toContain('Código copiado.'));
  expect(writeText).toHaveBeenCalledWith(code);
  writeText.mockRejectedValueOnce(Error('denied'));
  editor.view.dom.querySelector('button')!.click();
  await waitFor(() => expect(editor.view.dom.textContent).toContain('cópia manual'));
  select.value = 'python'; select.dispatchEvent(new Event('change'));
  expect(editor.state.doc.child(0).attrs.language).toBe('python');
  editor.commands.undo(); expect(editor.state.doc.child(0).attrs.language).toBe('old-language');
  editor.commands.setTextSelection(1);
  expect(editor.commands.keyboardShortcut('Tab')).toBe(true);
  expect(editor.state.doc.child(0).textContent).toBe('    ' + code);
  expect(editor.commands.keyboardShortcut('Shift-Tab')).toBe(true);
  expect(editor.state.doc.child(0).textContent).toBe(code);
});

test('Escape sai de código aninhado para um parágrafo válido e mantém código e linguagem', () => {
  create([{ type: 'callout', content: [{ type: 'codeBlock', attrs: { language: 'sql' }, content: [{ type: 'text', text: 'SELECT 1;' }] }] }]);
  editor.commands.setTextSelection(pos('SELECT 1;'));
  // keyboardShortcut captures only steps and drops selection-only changes;
  // dispatch the actual DOM key event to exercise focus/selection behavior.
  const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  editor.view.dom.dispatchEvent(escape);
  expect(escape.defaultPrevented).toBe(true);
  expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
  expect(editor.state.doc.child(0).child(0).attrs.language).toBe('sql');
  expect(editor.state.doc.child(0).child(0).textContent).toBe('SELECT 1;');
  editor.state.doc.check();
});

test('mídia renova URL, referências resolvem título atual e indisponibilidade sem serializar URLs', async () => {
  create([{ type: 'image', attrs: { attachmentId: 'media' } }, { type: 'paragraph', content: [{ type: 'pageReference', attrs: { targetPageId: 'target' } }] }]);
  let title = 'Título atual';
  const attachment = jest.fn().mockResolvedValue({ id: 'media', areaId: 'page', tipo: 'IMAGEM', nome: 'Exemplo', url: 'https://example.com/temporary?signature=secret' });
  const page = jest.fn().mockImplementation(async () => ({ id: 'target', available: title !== '', nome: title }));
  const navigate = jest.fn();
  const cleanup = configureDocumentResources(editor, { attachment, page, navigate });
  await waitFor(() => expect(editor.view.dom.querySelector('img')?.getAttribute('src')).toContain('signature=secret'));
  editor.view.dom.querySelector('img')!.dispatchEvent(new Event('error'));
  await waitFor(() => expect(attachment).toHaveBeenCalledWith('media', true));
  expect(JSON.stringify(editor.getJSON())).not.toContain('signature');
  expect(editor.view.dom.textContent).toContain('Título atual');
  (editor.view.dom.querySelector('.document-reference a') as HTMLAnchorElement).click();
  expect(navigate).toHaveBeenCalledWith('target');
  title = ''; window.dispatchEvent(new Event('focus'));
  await waitFor(() => expect(editor.view.dom.textContent).toContain('Página indisponível'));
  cleanup();
});

test('resolvedor agrupa leituras e isola anexos da página; erro permite nova tentativa', async () => {
  const response = (body: unknown, ok = true) => Promise.resolve({ ok, json: async () => body } as Response);
  const request = jest.fn().mockImplementation((path: string) => path.startsWith('/areas/references') ? response({ items: [{ id: 'a', available: true, nome: 'Atual' }, { id: 'b', available: false }] }) : response({ id: 'media', areaId: 'other-page', url: 'https://example.com', tipo: 'IMAGEM' }));
  const resources = createDocumentResources(request, jest.fn(), 'page');
  const [a, b] = await Promise.all([resources.page('a'), resources.page('b')]);
  expect(request).toHaveBeenCalledTimes(1); expect(a.nome).toBe('Atual'); expect(b.available).toBe(false);
  await expect(resources.attachment('media')).rejects.toThrow('indisponível');
  request.mockImplementationOnce(() => response({ id: 'media', areaId: 'page', url: 'https://example.com', tipo: 'IMAGEM' }));
  await expect(resources.attachment('media')).resolves.toMatchObject({ id: 'media' });
});
