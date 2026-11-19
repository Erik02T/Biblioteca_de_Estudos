import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActionRail, EditorLayout, PageCover } from './EditorLayout';
jest.mock('./EditorLayout.module.css', () => ({}));
afterEach(cleanup);

test('trocar ferramentas mantém documento, campos pendentes e retorna foco por Escape', () => {
  render(<EditorLayout topbar={<h1>Página</h1>} editor={<textarea aria-label="Documento" defaultValue="Texto preservado" />} properties={<input aria-label="Categoria" defaultValue="Inicial" />} attachments={<p>Materiais reais</p>} format={<p>Comandos</p>} rail={<button>Voltar</button>} wordCount={2} attachmentCount={0} />);
  const document = screen.getByRole('textbox', { name: 'Documento' });
  const properties = screen.getByRole('button', { name: 'Propriedades' });
  fireEvent.click(properties);
  fireEvent.change(screen.getByRole('textbox', { name: 'Categoria' }), { target: { value: 'Pendente' } });
  fireEvent.click(screen.getByRole('button', { name: 'Materiais (0)' }));
  expect(screen.queryByRole('textbox', { name: 'Categoria' })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('heading', { name: 'Materiais (0)' }), { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Materiais (0)' })).toHaveFocus();
  fireEvent.click(properties);
  expect(screen.getByRole('textbox', { name: 'Categoria' })).toHaveValue('Pendente');
  expect(screen.getByRole('textbox', { name: 'Documento' })).toBe(document);
});

test('Escape sai do modo foco sem acionar a saída da página', () => {
  const exit = jest.fn();
  render(<EditorLayout topbar={null} editor={<textarea aria-label="Documento" />} properties={null} attachments={null} format={null} rail={<button onClick={exit}>Voltar</button>} wordCount={0} attachmentCount={0} />);
  fireEvent.click(screen.getByRole('button', { name: 'Modo foco' }));
  expect(screen.getByTestId('editor-root')).toHaveAttribute('data-focus-mode', 'true');
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape', isComposing: true });
  expect(screen.getByTestId('editor-root')).toHaveAttribute('data-focus-mode', 'true');
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
  expect(screen.getByTestId('editor-root')).toHaveAttribute('data-focus-mode', 'false');
  expect(exit).not.toHaveBeenCalled();
});

test.each([
  { isComposing: true, keyCode: 0 },
  { isComposing: false, keyCode: 229 },
])('Escape de composição preserva foco e ferramenta: %o', composing => {
  render(<EditorLayout topbar={null} editor={<textarea className="tiptap" aria-label="Documento" defaultValue="日本語" />} properties={<input aria-label="Categoria" defaultValue="Pendente" />} attachments={null} format={null} rail={null} wordCount={1} attachmentCount={0} />);
  const document = screen.getByRole('textbox', { name: 'Documento' });
  fireEvent.click(screen.getByRole('button', { name: 'Modo foco' }));
  expect(fireEvent.keyDown(document, { key: 'Escape', ...composing })).toBe(true);
  expect(screen.getByTestId('editor-root')).toHaveAttribute('data-focus-mode', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Propriedades' }));
  const category = screen.getByRole('textbox', { name: 'Categoria' });
  category.focus();
  expect(fireEvent.keyDown(category, { key: 'Escape', ...composing })).toBe(true);
  expect(screen.getByRole('dialog', { name: 'Propriedades' })).toBeVisible();
  expect(category).toHaveFocus();
  expect(category).toHaveValue('Pendente');
  expect(screen.getByRole('textbox', { name: 'Documento' })).toBe(document);
  expect(document).toHaveValue('日本語');
  fireEvent.keyDown(category, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Propriedades' })).toHaveFocus();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test.each([
  { isComposing: true, keyCode: 0 },
  { isComposing: false, keyCode: 229 },
])('menu da página não captura composição e mantém teclado normal: %o', composing => {
  render(<ActionRail onBack={jest.fn()} onSave={jest.fn()} saveLabel="Salvar e voltar" menuItems={[{ label: 'Exportar', onClick: jest.fn() }, { label: 'Versões', onClick: jest.fn() }]} />);
  const trigger = screen.getByRole('button', { name: 'Mais opções da página' });
  fireEvent.click(trigger);
  const first = screen.getByRole('menuitem', { name: 'Exportar' });
  expect(first).toHaveFocus();
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape']) {
    expect(fireEvent.keyDown(first, { key, ...composing })).toBe(true);
    expect(first).toHaveFocus();
    expect(screen.getByRole('menu')).toBeVisible();
  }
  // The document listener must also ignore composition outside the menu.
  expect(fireEvent.keyDown(document.body, { key: 'Escape', ...composing })).toBe(true);
  expect(screen.getByRole('menu')).toBeVisible();
  fireEvent.keyDown(first, { key: 'ArrowDown' });
  expect(screen.getByRole('menuitem', { name: 'Versões' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('recorte é uma prévia local: cancelar preserva posição e concluir aplica apenas ao concluir', () => {
  const position = jest.fn();
  render(<PageCover imageUrl="/teste.png" position={50} onPosition={position} onPick={jest.fn()} onRemove={jest.fn()} />);
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reposicionar capa' }));
  fireEvent.change(screen.getByRole('slider'), { target: { value: '80' } });
  expect(position).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole('slider'), { key: 'Escape' });
  expect(position).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Reposicionar capa' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Reposicionar capa' }));
  fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
  fireEvent.click(screen.getByRole('button', { name: 'Concluir recorte' }));
  expect(position).toHaveBeenCalledWith(70);
});
