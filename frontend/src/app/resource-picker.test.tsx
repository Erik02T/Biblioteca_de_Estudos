import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { editorExtensions } from './extensions';
import { DocumentInsertion } from './document-insertion';
import { DocumentResourcePicker } from './DocumentResourcePicker';

let editor: Editor;
beforeEach(() => {
  editor = new Editor({ element: document.createElement('div'), extensions: editorExtensions, content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '/pagina' }] }] } });
  Object.defineProperty(editor.view, 'scrollToSelection', { value: () => {} });
  editor.commands.setTextSelection(8);
});
afterEach(() => { cleanup(); editor.destroy(); });
const reply = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);

test('seletor usa busca autenticada paginada e insere referência inline removendo somente o comando', async () => {
  const request = jest.fn().mockImplementation((path: string) => reply({ items: [{ id: path.includes('page=2') ? 'second' : 'first', nome: path.includes('page=2') ? 'Destino da segunda página' : 'Destino inicial', section: 'OUTROS' }], pagination: { totalPages: 2 } }));
  const close = jest.fn();
  render(<DocumentResourcePicker kind="pageInline" insertion={new DocumentInsertion(editor, true)} areaId="owner-page" attachments={[]} request={request} onAttachment={jest.fn()} onClose={close} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar página' }), { target: { value: 'Destino' } });
  await screen.findByRole('button', { name: /Destino inicial/ });
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  fireEvent.click(await screen.findByRole('button', { name: /Destino da segunda página/ }));
  expect(request).toHaveBeenLastCalledWith('/areas/search?q=Destino&page=2&limit=20', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(editor.state.doc.child(0).child(0).attrs.targetPageId).toBe('second');
  expect(editor.getText()).not.toContain('/pagina'); expect(close).toHaveBeenCalled();
});

test('erro de busca tem nova tentativa e cancelar preserva o texto de comando', async () => {
  const request = jest.fn().mockImplementationOnce(() => reply({}, 500)).mockImplementationOnce(() => reply({ items: [], pagination: { totalPages: 1 } }));
  const insertion = new DocumentInsertion(editor, true);
  const view = render(<DocumentResourcePicker kind="pageBlock" insertion={insertion} areaId="page" attachments={[]} request={request} onAttachment={jest.fn()} onClose={jest.fn()} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar página' }), { target: { value: 'Destino' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar buscar novamente' }));
  await screen.findByText('Nenhuma página encontrada.');
  view.unmount();
  expect(insertion.insert({ type: 'paragraph' })).toBe(false);
  expect(editor.getText()).toBe('/pagina');
});

test('upload inválido não insere bloco nem remove texto; material existente não exige outro upload', async () => {
  const request = jest.fn().mockImplementation(() => reply({ message: 'Tipo de arquivo não permitido' }, 400));
  const insertion = new DocumentInsertion(editor, true);
  render(<DocumentResourcePicker kind="attachment" insertion={insertion} areaId="page" attachments={[{ id: 'existing', areaId: 'page', tipo: 'ARQUIVO', nome: 'Anotação.txt', url: 'https://example.com/file' }]} request={request} onAttachment={jest.fn()} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Enviar arquivo', { selector: 'input' }), { target: { files: [new File(['bad'], 'arquivo.exe', { type: 'application/octet-stream' })] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Tipo de arquivo não permitido');
  expect(editor.getText()).toBe('/pagina');
  fireEvent.click(screen.getByRole('button', { name: 'Anotação.txt' }));
  expect(editor.state.doc.child(0).attrs.attachmentId).toBe('existing');
  expect(request).toHaveBeenCalledTimes(1);
});
