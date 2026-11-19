import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TableView } from './TableView';
import { BoardView } from './BoardView';
import { SavedViews } from './SavedViews';
import { TemplateGallery } from './TemplateGallery';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { collectionParameters, viewBody, viewRoute } from './collection-query';
import { libraryUrl, readLibraryRoute, type LibraryRoute } from './library-route';
import type { Area } from './page';

jest.mock('./page.module.css', () => ({}));

const area: Area = { id: '11111111-1111-4111-8111-111111111111', nome: 'Álgebra', categoria: 'Exatas', nivelEntendimento: 3, subSection: 'ESTUDANDO', section: 'FACULDADE', icone: '✦', updatedAt: '2026-11-16T12:00:00Z' };
const reply = (value: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => value } as Response);
afterEach(cleanup);

test('URL e configuração salva preservam todos os filtros, inclusive nível zero, sem persistir paginação', () => {
  const route: LibraryRoute = { view: 'recent', section: 'FACULDADE', subSection: 'ESTUDANDO', q: 'Álgebra', categoria: 'Exatas', minLevel: 0, maxLevel: 4, favorite: true, scope: 'ALL', layout: 'TABLE', order: 'nome', direction: 'asc', listPage: 3 };
  expect(readLibraryRoute(new URL(libraryUrl(route), 'http://localhost'))).toEqual(route);
  const body = viewBody(route);
  expect(body).not.toHaveProperty('listPage');
  expect(collectionParameters(route).get('minLevel')).toBe('0');
  expect(collectionParameters(route).get('recent')).toBe('true');
  const restored = viewRoute({ ...body, id: 'view', name: 'Revisão' });
  const expected = { ...route }; delete expected.listPage;
  expect(restored).toMatchObject(expected);
  expect(restored.listPage).toBeUndefined();
  expect(collectionParameters({ order: 'sortOrder' }).get('orderDirection')).toBe('asc');
  expect(viewBody({ order: 'sortOrder', direction: 'desc' }).orderDirection).toBe('desc');
  expect(() => readLibraryRoute(new URL('http://localhost/?minLevel=5&maxLevel=1'))).toThrow('Nível mínimo');
});

test('a visão salva de Idiomas mantém Grade como padrão e reabre Lista quando escolhida explicitamente', () => {
  const route: LibraryRoute = { section: 'LINGUAGENS', subSection: 'ESTUDANDO', q: 'verbos', categoria: 'Vocabulário' };
  const grid = viewBody(route);
  expect(grid.layout).toBe('GRID');
  const address = libraryUrl(viewRoute({ ...grid, id: 'grid', name: 'Gramática' }));
  expect(readLibraryRoute(new URL(address, 'http://localhost'))).toMatchObject({ ...route, layout: 'GRID' });
  expect(address).not.toContain('view=all');
  expect(viewRoute({ ...grid, layout: 'LIST', id: 'list', name: 'Lista antiga' }).layout).toBe('LIST');
});

test('tabela envia somente propriedades alteradas com o mesmo ID e preserva rascunho no conflito', async () => {
  const update = jest.fn().mockRejectedValue(new Error('Conflito de revisão'));
  const reload = jest.fn().mockResolvedValue({ ...area, nome: 'Atualizada remotamente' });
  render(<TableView areas={[area]} onEdit={jest.fn()} onUpdate={update} onReload={reload} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Título de Álgebra' }), { target: { value: 'Meu rascunho' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Status de Álgebra' }), { target: { value: 'ESTUDADO' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar propriedades' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Conflito');
  expect(screen.getByRole('textbox', { name: 'Título de Álgebra' })).toHaveValue('Meu rascunho');
  expect(update).toHaveBeenCalledWith(area, { nome: 'Meu rascunho', subSection: 'ESTUDADO' });
  fireEvent.click(screen.getByRole('button', { name: 'Recarregar propriedades' }));
  await waitFor(() => expect(reload).toHaveBeenCalledWith(area.id));
});

test('quadro oferece status por menu e favorito sem confundir abertura do documento', async () => {
  const update = jest.fn().mockResolvedValue(area), open = jest.fn();
  render(<BoardView areas={[area]} onEdit={open} onUpdate={update} onReload={jest.fn()} />);
  fireEvent.click(screen.getByText('Status da página'));
  fireEvent.click(screen.getByRole('button', { name: 'Mover para Estudado' }));
  await waitFor(() => expect(update).toHaveBeenCalledWith(area, { subSection: 'ESTUDADO' }));
  expect(open).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Favoritar Álgebra' }));
  await waitFor(() => expect(update).toHaveBeenCalledWith(area, { isFavorite: true }));
});

test('visualização nomeada transmite nome e filtros e reabre a configuração salva', async () => {
  const route: LibraryRoute = { view: 'all', layout: 'TABLE', q: 'Revisão', minLevel: 0 };
  const record = { id: 'v1', name: 'Minha revisão', ...viewBody(route) };
  const request = jest.fn().mockImplementation((path: string, init?: RequestInit) => reply(init?.method === 'POST' ? record : []));
  const apply = jest.fn();
  const onClose = jest.fn();
  render(<SavedViews route={route} request={request} onApply={apply} onClose={onClose} />);
  await screen.findByText('Nenhuma visão salva.');
  expect(screen.queryByRole('textbox', { name: 'Nome da visão' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Salvar como nova' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome da visão' }), { target: { value: 'Minha revisão' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar visão atual' }));
  await screen.findByText('Visão salva.');
  const posted = request.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(posted![1].body)).toMatchObject({ name: 'Minha revisão', layout: 'TABLE', filters: { search: 'Revisão', minLevel: 0 } });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir visão' }));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ q: 'Revisão', layout: 'TABLE', minLevel: 0 }));
  expect(onClose).toHaveBeenCalled();
});

test('configuração antiga incompatível não é aplicada silenciosamente', async () => {
  const invalid = { id: 'old', name: 'Antiga', ...viewBody({}), configurationError: 'Filtro desconhecido' };
  const request = jest.fn().mockImplementation(() => reply([invalid]));
  const apply = jest.fn();
  render(<SavedViews route={{}} request={request} onApply={apply} onClose={jest.fn()} />);
  await screen.findByRole('option', { name: 'Antiga (incompatível)' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Visão salva' }), { target: { value: 'old' } });
  expect(screen.getByRole('button', { name: 'Abrir visão' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Filtro desconhecido');
  expect(screen.getByRole('button', { name: 'Corrigir com configuração atual' })).toBeEnabled();
  expect(apply).not.toHaveBeenCalled();
});

test('falha de aplicação mantém galeria, seleção e chave de idempotência para nova tentativa', async () => {
  let failures = 1;
  const request = jest.fn().mockImplementation((path: string) => path.endsWith('/preview') ? reply({ id: 't', name: 'Modelo', content: { texto: 'Prévia preservada' }, files: [], metadata: {} }) : --failures >= 0 ? reply({ message: 'Falha de rede' }, 503) : reply(area, 201));
  const applied = jest.fn(), close = jest.fn();
  render(<TemplateGallery templates={[{ id: 't', name: 'Modelo', type: 'NOTE' }]} pages={[]} defaultSection="FACULDADE" defaultSubSection="ESTUDANDO" request={request} onApplied={applied} onClose={close} />);
  fireEvent.click(screen.getByRole('button', { name: 'Modelo' }));
  await screen.findByText('Prévia preservada');
  fireEvent.click(screen.getByRole('button', { name: 'Criar página com este modelo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede');
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Modelo' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Criar página com este modelo' }));
  await waitFor(() => expect(applied).toHaveBeenCalledWith(area));
  const attempts = request.mock.calls.filter(([path]) => path.endsWith('/apply'));
  expect(attempts).toHaveLength(2);
  expect(attempts[0][1].headers).toEqual(attempts[1][1].headers);
});

test('criação de modelo espera checkpoint e usa a revisão confirmada', async () => {
  const checkpoint = jest.fn().mockResolvedValue('2026-11-16T12:00:01Z');
  const request = jest.fn().mockImplementation(() => reply({ id: 'template' }, 201));
  render(<SaveTemplateDialog pageId={area.id} name={area.nome} request={request} checkpoint={checkpoint} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar modelo' }));
  await screen.findByText('Modelo salvo com cópias independentes dos materiais.');
  expect(checkpoint).toHaveBeenCalled();
  expect(request.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' });
  expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ pageId: area.id, updatedAt: '2026-11-16T12:00:01Z', name: area.nome });
});
