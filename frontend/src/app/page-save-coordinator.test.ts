import { IndexedDraftStore, type PageSnapshot } from './draft-store';
import { PageSaveCoordinator, PageSaveError, type SavedPage } from './page-save-coordinator';

const initial: PageSnapshot = { section: 'OUTROS', subSection: 'ESTUDANDO', nome: 'Teste', categoria: 'Geral', nivelEntendimento: 0, icone: '✦', parentId: null, targetPageId: null, coverAttachmentId: null, coverPosition: 50, fullWidth: false, conteudo: { type: 'doc', content: [] } };
const saved = (snapshot: PageSnapshot, revision = 'rev-2'): SavedPage => ({ ...snapshot, id: 'page', updatedAt: revision });
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
function setup(extra: Partial<ConstructorParameters<typeof PageSaveCoordinator>[0]> = {}) {
  const store = new IndexedDraftStore();
  const request = jest.fn(async (_id: string | undefined, body: PageSnapshot, _revision: string | undefined, _key: string) => { void _revision; void _key; return saved(body); });
  const read = jest.fn(async () => saved(initial, 'rev-1'));
  const coordinator = new PageSaveCoordinator({ userId: 'A', pageId: 'page', updatedAt: 'rev-1', initial, store, request, read, changed: () => {}, isCurrent: () => true, ...extra });
  return { coordinator, store, request, read };
}

test('fila única conserva conteúdo e metadados editados durante uma requisição', async () => {
  const { coordinator, store, request } = setup();
  const first = deferred<SavedPage>();
  request.mockImplementationOnce(() => first.promise);
  coordinator.update({ ...initial, nome: 'Título 1' });
  const flush = coordinator.flush();
  while (!request.mock.calls.length) await new Promise(done => setTimeout(done, 0));
  const newest = { ...initial, nome: 'Título 2', categoria: 'Nova', conteudo: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '日本語' }] }] } };
  coordinator.update(newest);
  first.resolve(saved({ ...initial, nome: 'Título 1' }));
  await flush;
  expect(request.mock.calls.map(call => call[1].nome)).toEqual(['Título 1', 'Título 2']);
  expect(request.mock.calls[1][1]).toEqual(newest);
  expect(request.mock.calls[1][2]).toBe('rev-2');
  expect(coordinator.dirty).toBe(false);
  expect(await store.list('A')).toEqual([]);
});

test('checkpoint e autosave compartilham a gravação pendente', async () => {
  const { coordinator, request } = setup();
  coordinator.update({ ...initial, categoria: 'Pendente' });
  await Promise.all([coordinator.flush(), coordinator.flush(), coordinator.flush()]);
  expect(request).toHaveBeenCalledTimes(1);
});

test('criação aceita a ordem de propriedades devolvida pelo JSONB sem falso conflito', async () => {
  const { coordinator, request } = setup({ pageId: undefined, updatedAt: undefined });
  const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '日本語' }] }] };
  coordinator.update({ ...initial, conteudo: content });
  request.mockImplementationOnce(async (_id, body) => saved({ ...body, conteudo: { content: [{ content: [{ text: '日本語', type: 'text' }], type: 'paragraph' }], type: 'doc' } }));
  await coordinator.flush();
  expect(coordinator.blocked).toBe(false);
  expect(coordinator.pageId).toBe('page');
});

test('criação com resposta perdida repete pedido e chave congelados antes de gravar edição posterior', async () => {
  const { coordinator, request, store } = setup({ pageId: undefined, updatedAt: undefined });
  coordinator.update(initial);
  request.mockRejectedValueOnce(new TypeError('Resposta perdida'));
  await expect(coordinator.flush()).rejects.toThrow('Resposta perdida');
  const draft = (await store.list('A'))[0];
  expect(draft.creationRequest).toEqual(initial);
  coordinator.update({ ...initial, nome: 'Depois da resposta perdida' });
  await coordinator.flush();
  expect(request.mock.calls[1][0]).toBeUndefined();
  expect(request.mock.calls[1][1]).toEqual(initial);
  expect(request.mock.calls[1][3]).toBe(request.mock.calls[0][3]);
  expect(request.mock.calls[2][0]).toBe('page');
  expect(request.mock.calls[2][1].nome).toBe('Depois da resposta perdida');
  expect(await store.list('A')).toEqual([]);
});

test('PATCH com resposta perdida reconcilia versão e preserva a edição posterior', async () => {
  const { coordinator, request, read } = setup();
  const attempt = { ...initial, nome: 'Enviado' };
  coordinator.update(attempt);
  request.mockRejectedValueOnce(new TypeError('Resposta perdida'));
  await expect(coordinator.flush()).rejects.toThrow();
  read.mockResolvedValue(saved(attempt, 'rev-2'));
  coordinator.update({ ...attempt, categoria: 'Mais nova' });
  await coordinator.flush();
  expect(read).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[1][2]).toBe('rev-2');
  expect(request.mock.calls[1][1].categoria).toBe('Mais nova');
});

test('não faz rebase automático sobre outra edição remota', async () => {
  const { coordinator, request, read, store } = setup();
  coordinator.update({ ...initial, nome: 'Local' });
  request.mockRejectedValueOnce(new TypeError('Rede'));
  await expect(coordinator.flush()).rejects.toThrow();
  read.mockResolvedValue(saved({ ...initial, nome: 'Outra aba' }, 'rev-3'));
  await expect(coordinator.flush()).rejects.toMatchObject({ status: 409 });
  await expect(coordinator.flush()).rejects.toMatchObject({ status: 409 });
  expect(request).toHaveBeenCalledTimes(1);
  expect((await store.list('A'))[0].snapshot.nome).toBe('Local');
});

test('reinício recupera somente a conta e revisão corretas; outra aba tem registro independente', async () => {
  const a = setup(); const second = setup();
  a.coordinator.update({ ...initial, nome: 'Aba 1' });
  second.coordinator.update({ ...initial, nome: 'Aba 2' });
  await Promise.all([a.coordinator.durable(), second.coordinator.durable()]);
  const drafts = await a.store.list('A');
  expect(drafts).toHaveLength(2);
  expect(await a.store.list('B')).toEqual([]);
  const restarted = setup();
  await expect(setup({ userId: 'B' }).coordinator.recover(drafts[0], saved(initial, 'rev-1'))).rejects.toThrow('outra conta');
  await expect(restarted.coordinator.recover(drafts[0], saved(initial, 'rev-9'))).rejects.toMatchObject({ status: 409 });
  await restarted.coordinator.recover(drafts[0], saved(initial, 'rev-1'));
  expect(restarted.coordinator.snapshot.nome).toBe(drafts[0].snapshot.nome);
  await restarted.coordinator.flush();
  expect(await a.store.list('A')).toHaveLength(1);
});

test('confirmação atrasada após troca de conta conserva o rascunho e não atualiza a sessão', async () => {
  let current = true;
  const { coordinator, request, store } = setup({ isCurrent: () => current });
  const response = deferred<SavedPage>();
  request.mockReturnValueOnce(response.promise);
  coordinator.update({ ...initial, nome: 'Conta A' });
  const flush = coordinator.flush();
  while (!request.mock.calls.length) await new Promise(done => setTimeout(done, 0));
  current = false; response.resolve(saved(initial));
  await expect(flush).rejects.toThrow('conta mudou');
  expect(coordinator.lastSaved).toBeUndefined();
  expect((await store.list('A'))[0].snapshot.nome).toBe('Conta A');
  expect(await store.list('B')).toEqual([]);
});

test('falha de IndexedDB não envia pedido sem proteção local', async () => {
  const { coordinator, request } = setup({ store: { put: () => Promise.reject(new Error('Quota')), list: async () => [], remove: async () => {} } });
  coordinator.update({ ...initial, nome: 'Preservado em memória' });
  await expect(coordinator.flush()).rejects.toThrow('Quota');
  expect(coordinator.dirty).toBe(true);
  expect(request).not.toHaveBeenCalled();
});

test('409 conserva o rascunho e impede repetições automáticas', async () => {
  const { coordinator, request, store } = setup();
  request.mockRejectedValueOnce(new PageSaveError('Conflito', 409));
  coordinator.update({ ...initial, nome: 'Local' });
  await expect(coordinator.flush()).rejects.toThrow('Conflito');
  await expect(coordinator.flush()).rejects.toThrow('Conflito');
  expect(request).toHaveBeenCalledTimes(1);
  expect(await store.list('A')).toHaveLength(1);
});

test('rejeição definitiva de criação permite corrigir o pedido; 500 mantém a chave e o pedido incertos', async () => {
  const { coordinator, request } = setup({ pageId: undefined, updatedAt: undefined });
  coordinator.update({ ...initial, nome: 'Inválido' });
  request.mockRejectedValueOnce(new PageSaveError('DTO inválido', 400));
  await expect(coordinator.flush()).rejects.toThrow('DTO inválido');
  coordinator.update({ ...initial, nome: 'Corrigido' });
  request.mockRejectedValueOnce(new PageSaveError('Resposta incerta', 500));
  await expect(coordinator.flush()).rejects.toThrow('Resposta incerta');
  coordinator.update({ ...initial, nome: 'Mais novo' });
  await coordinator.flush();
  expect(request.mock.calls[1][1].nome).toBe('Corrigido');
  expect(request.mock.calls[2][1].nome).toBe('Corrigido');
  expect(request.mock.calls[3][1].nome).toBe('Mais novo');
});

test('remoção ou gravação antiga não apaga uma sequência nova no IndexedDB', async () => {
  const { coordinator, store } = setup();
  coordinator.update({ ...initial, nome: 'Primeira' }); await coordinator.durable();
  const older = (await store.list('A'))[0];
  coordinator.update({ ...initial, nome: 'Mais nova' }); await coordinator.durable();
  await store.put(older); await store.remove('A', older.id, older.sequence);
  expect((await store.list('A'))[0].snapshot.nome).toBe('Mais nova');
  await store.remove('B', older.id, 100);
  expect(await store.list('A')).toHaveLength(1);
});
