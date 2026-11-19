import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Home, { type Area } from './page';
import { draftStore } from './draft-store';

jest.mock('./page.module.css', () => ({}));
jest.mock('./EditorLayout.module.css', () => ({}));
jest.mock('./LibraryNavigation.module.css', () => ({}));
jest.mock('./PortabilityDialog.module.css', () => ({}));
jest.mock('./BlockControls.module.css', () => ({}));
jest.mock('@tiptap/react', () => ({ useEditor: () => null, EditorContent: () => null }));
const id = '11111111-1111-4111-8111-111111111111';
let page: Area;
let failSave: boolean | 'network' = false;
let unavailable = false;
const response = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
beforeEach(() => {
  window.localStorage.setItem('biblioteca-access-token', 'test-only-token');
  window.history.replaceState(null, '', `/?page=${id}`);
  failSave = false; unavailable = false;
  page = { id, nome: 'Página persistida', categoria: 'Categoria', section: 'LINGUAGENS', subSection: 'ESTUDANDO', nivelEntendimento: 0, icone: '✦', conteudo: { type: 'doc', content: [{ type: 'paragraph' }] }, updatedAt: '2026-11-13T12:00:00.000Z' };
  global.fetch = jest.fn().mockImplementation((input: string, init?: RequestInit) => {
    const url = new URL(input);
    if (url.pathname === '/auth/me') return response({ id: 'fixture-owner' });
    if (url.pathname === `/areas/${page.id}` && init?.method === 'PATCH') {
      if (failSave) return Promise.reject(failSave === 'network' ? new TypeError('Failed to fetch') : new Error('Rede indisponível'));
      page = { ...page, ...JSON.parse(init.body as string), updatedAt: new Date(new Date(page.updatedAt).getTime() + 1).toISOString() } as Area;
      return response(page);
    }
    if (url.pathname === `/areas/${page.id}`) return unavailable ? response({ message: 'Não encontrada' }, 404) : response(page);
    if (url.pathname === '/areas' && init?.method === 'POST') {
      page = { ...page, ...JSON.parse(init.body as string), id: '22222222-2222-4222-8222-222222222222' } as Area;
      return response(page, 201);
    }
    if (url.pathname === '/attachments') return response([]);
    if (url.pathname === '/areas' || url.pathname === '/areas/navigation') return response({ items: [page], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    if (url.pathname.endsWith('/opened')) return response({ areaId: page.id, lastOpenedAt: new Date().toISOString() }, 201);
    if (url.pathname === '/view-configurations') return response([]);
    return response({ message: 'Não encontrada' }, 404);
  });
});
afterEach(() => { cleanup(); window.localStorage.clear(); });

async function renderHome() {
  let view!: ReturnType<typeof render>;
  // Complete identity and initial collection effects before interacting.
  await act(async () => { view = render(<Home />); });
  return view;
}

test('busca da coleção espera o fim da composição e aplica após 300 ms', async () => {
  window.history.replaceState(null, '', '/?section=LINGUAGENS');
  await renderHome();
  await screen.findByRole('heading', { name: 'Página persistida' });
  const search = screen.getByRole('searchbox', { name: 'Buscar nesta área' });
  jest.useFakeTimers();
  try {
    fireEvent.compositionStart(search);
    fireEvent.change(search, { target: { value: 'にほんご' } });
    fireEvent.keyDown(search, { key: 'Enter', isComposing: true });
    await act(async () => { jest.advanceTimersByTime(350); });
    expect(window.location.search).toBe('?section=LINGUAGENS');
    fireEvent.change(search, { target: { value: '日本語' } });
    fireEvent.compositionEnd(search, { data: '日本語' });
    await act(async () => { jest.advanceTimersByTime(299); });
    expect(window.location.search).toBe('?section=LINGUAGENS');
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(new URLSearchParams(window.location.search).get('q')).toBe('日本語');
  } finally {
    jest.useRealTimers();
  }
});

test('uma resposta antiga da coleção não substitui resultados nem corrige a página atual', async () => {
  window.history.replaceState(null, '', '/?section=LINGUAGENS');
  const baseFetch = global.fetch;
  let signal: AbortSignal | null | undefined;
  let respond!: (value: Response) => void;
  const delayed = new Promise<Response>(resolve => { respond = resolve; });
  const result = (name: string) => ({ items: [{ ...page, nome: name }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  global.fetch = jest.fn().mockImplementation((input: string, init?: RequestInit) => {
    const url = new URL(input);
    if (url.pathname === '/areas' && url.searchParams.get('q') === 'antiga') {
      signal = init?.signal;
      return delayed;
    }
    if (url.pathname === '/areas' && url.searchParams.get('q') === 'atual') return response(result('Consulta atual'));
    return baseFetch(input, init);
  });
  await renderHome();
  const search = await screen.findByRole('searchbox', { name: 'Buscar nesta área' });
  fireEvent.change(search, { target: { value: 'antiga' } });
  fireEvent.keyDown(search, { key: 'Enter' });
  expect(new URLSearchParams(window.location.search).get('q')).toBe('antiga');
  fireEvent.change(search, { target: { value: 'atual' } });
  fireEvent.keyDown(search, { key: 'Enter' });
  await screen.findByRole('heading', { name: 'Consulta atual' });
  expect(signal?.aborted).toBe(true);
  await act(async () => { respond(await response(result('Resposta antiga'))); });
  expect(screen.queryByRole('heading', { name: 'Resposta antiga' })).not.toBeInTheDocument();
  expect(new URLSearchParams(window.location.search).get('q')).toBe('atual');
});


test('F12: editar título de raiz desconhecida não sobrescreve seu JSON com documento vazio', async () => {
  const original = { futureFormat: { value: 'Preservar 日本語' } };
  page = { ...page, conteudo: original } as Area;
  await renderHome();
  await screen.findByRole('region', { name: 'Conteúdo original preservado' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Título seguro' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e voltar' }));
  await screen.findByRole('heading', { name: 'Título seguro' });
  const writes = (global.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'PATCH');
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0][1].body)).not.toHaveProperty('conteudo');
  expect(page.conteudo).toEqual(original);
});

test('F12: abrir documento reutiliza metadados da árvore; voltar à coleção os atualiza', async () => {
  window.history.replaceState(null, '', '/?section=LINGUAGENS');
  await renderHome();
  await screen.findByRole('heading', { name: 'Página persistida' });
  const calls = () => (global.fetch as jest.Mock).mock.calls.filter(([url]) => new URL(url).pathname === '/areas/navigation').length;
  const before = calls();
  fireEvent.click(within(screen.getByRole('region', { name: 'Resultados da coleção' })).getByRole('link', { name: 'Página persistida' }));
  await screen.findByRole('textbox', { name: 'Nome da página' });
  expect(calls()).toBe(before);
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await screen.findByRole('heading', { name: 'Página persistida' });
  expect(calls()).toBe(before + 1);
});

test('F12: purge exige confirmação e transmite a revisão exibida; falha conserva ação para repetir', async () => {
  window.history.replaceState(null, '', '/?view=trash');
  const baseFetch = global.fetch;
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  let failPurge = true;
  global.fetch = jest.fn().mockImplementation((input: string, init?: RequestInit) => {
    const path = new URL(input).pathname;
    if (path === '/areas/trash') return response({ items: [{ ...page, deletedAt: '2026-11-17T12:00:00Z' }], pagination: { page: 1, total: 1, totalPages: 1, limit: 20 } });
    if (path.endsWith('/purge')) return failPurge ? response({ message: 'Limpeza interrompida. Tente novamente.' }, 503) : response({ purgedIds: [id] });
    return baseFetch(input, init);
  });
  await renderHome();
  await screen.findByRole('heading', { name: 'Página persistida' });
  const menu = screen.getByLabelText('Ações da página: Página persistida');
  fireEvent.click(menu);
  fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));
  expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).endsWith('/purge'))).toHaveLength(0);
  confirm.mockReturnValue(true);
  fireEvent.click(menu);
  fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));
  await screen.findByText('Limpeza interrompida. Tente novamente.');
  fireEvent.click(menu);
  expect(screen.getByRole('button', { name: 'Excluir definitivamente' })).toBeEnabled();
  const write = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).endsWith('/purge'))!;
  expect(write[1].method).toBe('DELETE');
  expect(JSON.parse(write[1].body)).toEqual({ confirmed: true, updatedAt: page.updatedAt });
  failPurge = false;
  fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).endsWith('/purge'))).toHaveLength(2));
  confirm.mockRestore();
});

test('F11: favoritar durante edição da linha usa revisão própria confirmada sem perder o título digitado', async () => {
  window.history.replaceState(null, '', '/?section=LINGUAGENS&layout=TABLE');
  // Finish initial identity/collection effects before editing a loaded row.
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Título de Página persistida' }), { target: { value: 'Título digitado antes do favorito' } });
  fireEvent.click(screen.getByRole('button', { name: 'Favoritar Página persistida' }));
  await screen.findByRole('button', { name: 'Desfavoritar Página persistida' });
  expect(screen.getByRole('textbox', { name: 'Título de Página persistida' })).toHaveValue('Título digitado antes do favorito');
  const revision = page.updatedAt;
  fireEvent.click(screen.getByRole('button', { name: 'Salvar propriedades' }));
  await screen.findByRole('textbox', { name: 'Título de Título digitado antes do favorito' });
  const writes = (global.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'PATCH');
  expect(JSON.parse(writes[1][1].body)).toMatchObject({ updatedAt: revision, nome: 'Título digitado antes do favorito' });
});

test('BUG-F7-004: endereço por ID reabre a página após uma nova montagem', async () => {
  const first = await renderHome();
  expect(await screen.findByRole('textbox', { name: 'Nome da página' })).toHaveValue('Página persistida');
  first.unmount();
  await renderHome();
  expect(await screen.findByRole('textbox', { name: 'Nome da página' })).toHaveValue('Página persistida');
  expect(window.location.search).toBe(`?page=${id}`);
});

test('salva metadados pendentes antes de voltar para a lista', async () => {
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Nome preservado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await screen.findByRole('heading', { name: 'Nome preservado' });
  expect(page.nome).toBe('Nome preservado');
  expect(window.location.search).toBe('?section=LINGUAGENS&status=ESTUDANDO');
});

test('nova subpágina confirma edição da mãe e inicia com parentesco preenchido', async () => {
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Mãe salva antes da filha' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mais opções da página' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Nova subpágina' }));
  await screen.findByRole('button', { name: 'Criar página' });
  expect(page.nome).toBe('Mãe salva antes da filha');
  fireEvent.click(screen.getByRole('button', { name: 'Propriedades' }));
  expect(screen.getByRole('combobox', { name: 'Página mãe' })).toHaveValue(id);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar ferramenta' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Filha' } });
  fireEvent.click(screen.getByRole('button', { name: 'Criar página' }));
  await screen.findByRole('button', { name: 'Salvar e voltar' });
  expect(page.parentId).toBe(id);
});

test('reabrir a raiz depois de iniciar uma filha não reaplica a mãe da criação', async () => {
  await renderHome();
  await screen.findByRole('textbox', { name: 'Nome da página' });
  fireEvent.click(screen.getByRole('button', { name: 'Mais opções da página' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Nova subpágina' }));
  await screen.findByRole('button', { name: 'Criar página' });
  const breadcrumb = screen.getByRole('navigation', { name: 'Caminho da página' });
  fireEvent.click(breadcrumb.querySelector(`a[href="/?page=${id}"]`)!);
  await screen.findByRole('button', { name: 'Salvar e voltar' });
  fireEvent.click(screen.getByRole('button', { name: 'Propriedades' }));
  expect(screen.getByRole('combobox', { name: 'Página mãe' })).toHaveValue('');
});

test('falha de rede impede navegação e preserva o formulário e a URL', async () => {
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Rascunho local' } });
  failSave = true;
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await screen.findByText('Rede indisponível');
  expect(screen.getByRole('textbox', { name: 'Nome da página' })).toHaveValue('Rascunho local');
  expect(window.location.search).toBe(`?page=${id}`);
  expect(page.nome).toBe('Página persistida');
});

test('falha de salvamento durante popstate repõe o endereço da página sem descartar o texto', async () => {
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Não descartar' } });
  failSave = true;
  window.history.pushState(null, '', '/');
  fireEvent(window, new PopStateEvent('popstate'));
  await screen.findByText('Rede indisponível');
  await waitFor(() => expect(window.location.search).toBe(`?page=${id}`));
  expect(screen.getByRole('textbox', { name: 'Nome da página' })).toHaveValue('Não descartar');
});

test('página indisponível não exibe conteúdo de outra conta nem deixa formulário antigo aberto', async () => {
  unavailable = true;
  await renderHome();
  await screen.findByText('Página indisponível ou sem acesso.');
  expect(screen.queryByRole('textbox', { name: 'Nome da página' })).not.toBeInTheDocument();
});

test('criar página adiciona seu endereço ao histórico sem substituir a coleção anterior', async () => {
  window.history.replaceState(null, '', '/?section=LINGUAGENS&status=ESTUDANDO');
  await renderHome();
  fireEvent.click(await screen.findByRole('button', { name: 'Nova página' }));
  expect(screen.getByTestId('save-status')).toHaveTextContent('Página ainda não criada');
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Página nova' } });
  fireEvent.click(screen.getByRole('button', { name: 'Propriedades' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Categoria' }), { target: { value: 'Teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Fechar ferramenta' }));
  fireEvent.click(screen.getByRole('button', { name: 'Criar página' }));
  await waitFor(() => expect(window.location.search).toBe('?page=22222222-2222-4222-8222-222222222222'));
  window.history.back();
  await screen.findByRole('button', { name: 'Nova página' });
  expect(window.location.search).toBe('?section=LINGUAGENS&status=ESTUDANDO');
});

test('propriedades pendentes não aparecem como salvas e podem ser gravadas explicitamente', async () => {
  await renderHome();
  const title = await screen.findByRole('textbox', { name: 'Nome da página' });
  expect(screen.getByTestId('save-status')).toHaveTextContent(/^Salvo$/);
  fireEvent.change(title, { target: { value: 'Título alterado' } });
  expect(screen.getByTestId('save-status')).toHaveTextContent('Alterações pendentes');
  expect(page.nome).toBe('Página persistida');
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e voltar' }));
  await screen.findByRole('heading', { name: 'Título alterado' });
  expect(page.nome).toBe('Título alterado');
});

test('Escape fecha o menu e devolve foco sem sair da página', async () => {
  await renderHome();
  await screen.findByRole('textbox', { name: 'Nome da página' });
  const trigger = screen.getByRole('button', { name: 'Mais opções da página' });
  fireEvent.click(trigger);
  expect(screen.getByRole('menuitem', { name: 'Nova subpágina' })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(window.location.search).toBe(`?page=${id}`);
});

test('composição IME não dispara o atalho de saída', async () => {
  await renderHome();
  const title = await screen.findByRole('textbox', { name: 'Nome da página' });
  fireEvent.keyDown(title, { key: 'Escape', isComposing: true });
  expect(window.location.search).toBe(`?page=${id}`);
});

test('RF-014: remontagem oferece recuperar metadados duráveis depois de conferir a versão remota', async () => {
  const first = await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Rascunho após reinício' } });
  await waitFor(async () => expect(await draftStore.list('fixture-owner')).toHaveLength(1));
  first.unmount();
  await renderHome();
  expect(await screen.findByRole('textbox', { name: 'Nome da página' })).toHaveValue('Página persistida');
  fireEvent.click(await screen.findByRole('button', { name: 'Abrir recuperação' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Recuperar para edição' }));
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Nome da página' })).toHaveValue('Rascunho após reinício'));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e voltar' }));
  await screen.findByRole('heading', { name: 'Rascunho após reinício' });
  expect(page.nome).toBe('Rascunho após reinício');
  await waitFor(async () => expect(await draftStore.list('fixture-owner')).toHaveLength(0));
});

test('RF-014: troca de conta desmonta o formulário anterior e não oferece seus rascunhos', async () => {
  const previous = global.fetch;
  global.fetch = jest.fn().mockImplementation((input: string, init?: RequestInit) => {
    if (window.localStorage.getItem('biblioteca-access-token') === 'account-b-token') {
      if (new URL(input).pathname === '/auth/me') return response({ id: 'other-owner' });
      if (new URL(input).pathname === `/areas/${id}`) return response({ message: 'Não encontrada' }, 404);
    }
    return previous(input, init);
  });
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Privado da conta A' } });
  await waitFor(async () => expect(await draftStore.list('fixture-owner')).toHaveLength(1));
  window.localStorage.setItem('biblioteca-access-token', 'account-b-token');
  fireEvent(window, new StorageEvent('storage', { key: 'biblioteca-access-token' }));
  await screen.findByText('Página indisponível ou sem acesso.');
  expect(screen.queryByRole('textbox', { name: 'Nome da página' })).not.toBeInTheDocument();
  expect(screen.queryByText('Privado da conta A')).not.toBeInTheDocument();
  expect(await draftStore.list('other-owner')).toEqual([]);
  expect((await draftStore.list('fixture-owner'))[0].snapshot.nome).toBe('Privado da conta A');
});

test('RF-014: editar título não reenvia referência inalterada nem normaliza ícone legado', async () => {
  page.targetPageId = '22222222-2222-4222-8222-222222222222';
  page.icone = null;
  const previous = global.fetch;
  const patches: Record<string, unknown>[] = [];
  global.fetch = jest.fn().mockImplementation((input: string, init?: RequestInit) => {
    if (init?.method === 'PATCH' && new URL(input).pathname === `/areas/${id}`) {
      const body = JSON.parse(init.body as string) as Record<string, unknown>; patches.push(body);
      if ('targetPageId' in body) return response({ message: 'Página referenciada não encontrada.' }, 404);
    }
    return previous(input, init);
  });
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Título sem mexer na referência' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e voltar' }));
  await screen.findByRole('heading', { name: 'Título sem mexer na referência' });
  expect(patches).toHaveLength(1);
  expect(patches[0]).toEqual({ nome: 'Título sem mexer na referência', updatedAt: '2026-11-13T12:00:00.000Z' });
  expect(page.targetPageId).toBe('22222222-2222-4222-8222-222222222222');
  expect(page.icone).toBeNull();
});

test('erro de rede orienta recuperação sem descartar os campos', async () => {
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Preservar após falha' } });
  failSave = 'network';
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await screen.findByText(/Falha de conexão ao salvar/);
  expect(screen.getByRole('textbox', { name: 'Nome da página' })).toHaveValue('Preservar após falha');
});

test('área abre diretamente a coleção e status sobrevive à recarga', async () => {
  window.history.replaceState(null, '', '/');
  const first = await renderHome();
  fireEvent.click(await screen.findByRole('link', { name: 'Idiomas' }));
  await screen.findByRole('heading', { name: 'Página persistida' });
  expect(window.location.search).toBe('?section=LINGUAGENS');
  const status = () => within(screen.getByRole('group', { name: 'Status da coleção' }));
  expect(status().getByRole('button', {name:/^Todos os status/})).toHaveAttribute('aria-pressed','true');
  fireEvent.click(status().getByRole('button', {name:/^Estudando/}));
  await waitFor(() => expect(window.location.search).toBe('?section=LINGUAGENS&status=ESTUDANDO'));
  first.unmount(); await renderHome();
  await screen.findByRole('heading', { name: 'Página persistida' });
  expect(status().getByRole('button', {name:/^Estudando/})).toHaveAttribute('aria-pressed','true');
});

test('navegação comum no editor preserva metadados antes de trocar de área', async () => {
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', {name:'Nome da página'}), {target:{value:'Título salvo pela lateral'}});
  fireEvent.click(screen.getByRole('link', {name:'Faculdade'}));
  await waitFor(() => expect(window.location.search).toBe('?section=FACULDADE'));
  expect(page.nome).toBe('Título salvo pela lateral');
  expect(screen.queryByRole('textbox', {name:'Nome da página'})).not.toBeInTheDocument();
});

test('busca aberta no editor consome Escape e mantém a página', async () => {
  await renderHome();
  await screen.findByRole('textbox', {name:'Nome da página'});
  fireEvent.click(screen.getByRole('button', {name:'Buscar páginas'}));
  fireEvent.keyDown(screen.getByRole('textbox', {name:'Buscar em toda a biblioteca'}), {key:'Escape'});
  expect(window.location.search).toBe(`?page=${id}`);
  expect(screen.queryByRole('dialog', {name:'Busca na biblioteca'})).not.toBeInTheDocument();
  expect(screen.getByRole('button', {name:'Buscar páginas'})).toHaveFocus();
});

test('área e página alternam o destino ativo sem retirar a árvore após recarregar ou voltar', async () => {
  page.nome = 'English';
  window.history.replaceState(null, '', '/?section=LINGUAGENS');
  const first = await renderHome();
  const navigation = () => within(screen.getByRole('navigation', { name: 'Biblioteca de Estudos' }));
  expect(navigation().getByRole('link', { name: 'Idiomas' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(await navigation().findByRole('link', { name: 'English' }));
  await screen.findByRole('textbox', { name: 'Nome da página' });
  expect(navigation().getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'page');
  expect(navigation().getByRole('link', { name: 'Idiomas' })).not.toHaveAttribute('aria-current');

  first.unmount();
  await renderHome();
  expect(await navigation().findByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'page');
  await act(async () => window.history.back());
  await waitFor(() => expect(navigation().getByRole('link', { name: 'Idiomas' })).toHaveAttribute('aria-current', 'page'));
  window.history.forward();
  await waitFor(() => expect(navigation().getByRole('link', { name: 'English' })).toHaveAttribute('aria-current', 'page'));
});

test('painel móvel volta ao acionador ao sair e foca o conteúdo ao navegar', async () => {
  const media = jest.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: false, media: query, onchange: null, addEventListener: jest.fn(), removeEventListener: jest.fn(),
    addListener: jest.fn(), removeListener: jest.fn(), dispatchEvent: jest.fn(),
  }));
  try {
    page.nome = 'English';
    window.history.replaceState(null, '', '/?section=LINGUAGENS');
    await renderHome();
    const trigger = screen.getByRole('button', { name: 'Navegação' });
    expect(screen.getByRole('main')).toBeVisible();
    fireEvent.click(trigger);
    const drawer = () => within(screen.getByRole('dialog', { name: 'Biblioteca de Estudos' }));
    const close = drawer().getByRole('button', { name: 'Fechar navegação' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    fireEvent.click(drawer().getByRole('link', { name: 'English' }));
    await waitFor(() => expect(screen.getByRole('main', { name: 'English' })).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: 'Biblioteca de Estudos' })).not.toBeInTheDocument();
  } finally {
    media.mockRestore();
  }
});

test('retorno do editor recupera filtros e visualização da coleção', async () => {
  const collection = '/?section=LINGUAGENS&status=ESTUDANDO&q=Página&scope=ALL&layout=LIST&order=nome&direction=asc';
  window.history.replaceState(null, '', collection);
  // Settle identity and the initial collection loads before selecting its card.
  await renderHome();
  fireEvent.click(within(screen.getByRole('region', { name: 'Resultados da coleção' })).getByRole('link', {name:'Página persistida'}));
  await screen.findByRole('textbox', {name:'Nome da página'});
  fireEvent.click(screen.getByRole('button', {name:'Voltar'}));
  await screen.findByRole('heading', {name:'Página persistida'});
  expect(new URLSearchParams(window.location.search).get('q')).toBe('Página');
  expect(screen.getByRole('combobox', {name:'Ordem'})).toHaveValue('nome:asc');
});

test('duplicação grava propriedades pendentes antes de criar a cópia', async () => {
  const previousFetch = global.fetch;
  let copiedName: string | undefined;
  global.fetch = jest.fn().mockImplementation((input: string, init?: RequestInit) => {
    if (new URL(input).pathname === `/areas/${id}/duplicate`) {
      copiedName = page.nome;
      return response({ ...page, id: '22222222-2222-4222-8222-222222222222' });
    }
    return previousFetch(input, init);
  });
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Título pendente para cópia' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mais opções da página' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicar página' }));
  await waitFor(() => expect(copiedName).toBeDefined());
  expect(copiedName).toBe('Título pendente para cópia');
});

test('falha ao gravar propriedades impede duplicar e mantém os campos', async () => {
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Título a preservar' } });
  failSave = 'network';
  fireEvent.click(screen.getByRole('button', { name: 'Mais opções da página' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicar página' }));
  await screen.findByText(/Não foi possível conectar à API/);
  expect(screen.getByRole('textbox', { name: 'Nome da página' })).toHaveValue('Título a preservar');
  expect((global.fetch as jest.Mock).mock.calls.some(([url]) => new URL(url).pathname.endsWith('/duplicate'))).toBe(false);
  expect(window.location.search).toBe(`?page=${id}`);
});

test('conflito legado de documento usa Página e conserva o campo pendente', async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn().mockImplementation((input: string, init?: RequestInit) => init?.method === 'PATCH'
    ? response({ message: 'Este bloco foi atualizado por outro usuário. Recarregue a página e tente novamente.' }, 409)
    : previousFetch(input, init));
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Título em conflito' } });
  fireEvent.click(screen.getByRole('button', { name: 'Propriedades' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar alterações' }));
  expect((await screen.findAllByText(/Conflito — esta página/)).some(element => element.getAttribute('role') === 'alert')).toBe(true);
  expect(screen.queryByText(/Este bloco foi atualizado/)).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Nome da página' })).toHaveValue('Título em conflito');
  expect(page.nome).toBe('Página persistida');
});

test('aplicar pendências após falha de saída limpa o aviso somente após persistência confirmada', async () => {
  await renderHome();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Nome da página' }), { target: { value: 'Nome recuperado' } });
  failSave = 'network';
  fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
  await screen.findByText(/Falha de conexão ao salvar/);
  failSave = false;
  fireEvent.click(screen.getByRole('button', { name: 'Propriedades' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar alterações' }));
  await waitFor(() => expect(screen.getByTestId('save-status')).toHaveTextContent(/^Salvo$/));
  expect(page.nome).toBe('Nome recuperado');
  expect(screen.queryByText(/Falha de conexão ao salvar/)).not.toBeInTheDocument();
  expect(window.location.search).toBe(`?page=${id}`);
});

test('falha ao carregar modelos não aparece como galeria vazia', async () => {
  window.history.replaceState(null, '', '/?section=LINGUAGENS');
  await renderHome();
  await screen.findByRole('heading', { name: 'Página persistida' });
  fireEvent.click(screen.getByRole('button', { name: 'Modelos' }));
  expect(await screen.findByText('Não foi possível carregar os modelos.')).toBeInTheDocument();
  expect(screen.queryByText('Nenhum modelo criado ainda.')).not.toBeInTheDocument();
  const previousFetch = global.fetch;
  global.fetch = jest.fn().mockImplementation((input: string, init?: RequestInit) => new URL(input).pathname === '/templates' ? response([]) : previousFetch(input, init));
  fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar modelos novamente' }));
  expect(await screen.findByText('Nenhum modelo criado ainda.')).toBeInTheDocument();
});
