import { waitFor } from '@testing-library/react';
import { ApiNetworkError, createAuthenticatedFetch, fetchApi, resolveApiUrl, type AuthTokens } from './api-client';

const reply = (status: number, body: unknown = {}) => ({ status, ok: status < 400, json: () => Promise.resolve(body) }) as Response;
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const base = 'http://localhost:3000';
function session() {
  const state: { access?: string; refresh?: string } = { access: 'expired', refresh: 'old-refresh' };
  const saveTokens = jest.fn((tokens: AuthTokens) => { state.access = tokens.accessToken; state.refresh = tokens.refreshToken; });
  const request = createAuthenticatedFetch({ apiUrl: base, getAccessToken: () => state.access, getRefreshToken: () => state.refresh, saveTokens });
  return { state, saveTokens, request };
}
const auth = (init?: RequestInit) => (init?.headers as Record<string, string> | undefined)?.Authorization;
beforeEach(() => { global.fetch = jest.fn(); });

test.each([
  { authorization: 'Bearer old', 'Content-Type': 'application/json' },
  new Headers({ Authorization: 'Bearer old', 'Content-Type': 'application/json' }),
  [['authorization', 'Bearer old'], ['Content-Type', 'application/json']],
] as HeadersInit[])('normaliza HeadersInit sem duplicar autorização nem perder Content-Type: %p', async headers => {
  const { request } = session();
  jest.mocked(fetch).mockResolvedValue(reply(200));
  await request(base + '/attachments', { method: 'POST', headers, body: '{}' }, 'fallback');
  const sent = new Headers(jest.mocked(fetch).mock.calls[0][1]?.headers);
  expect(sent.get('authorization')).toBe('Bearer expired');
  expect(sent.get('content-type')).toBe('application/json');
});

test('URL configurada é respeitada sem desviar sessão local para a API de produção', () => {
  expect(resolveApiUrl(' http://localhost:3000/ ')).toBe(base);
  expect(resolveApiUrl('http://[::1]:3000')).toBe('http://[::1]:3000');
});

test('erro de rede informa método e endpoint sem expor query nem credenciais', async () => {
  jest.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
  const result = fetchApi(`${base}/areas?q=nota-privada&token=secret`, { method: 'PATCH' });
  await expect(result).rejects.toBeInstanceOf(ApiNetworkError);
  await expect(result).rejects.toMatchObject({ endpoint: `${base}/areas`, code: 'API_NETWORK_ERROR' });
  await expect(result).rejects.toThrow('PATCH');
  try { await result; } catch (error) { expect((error as Error).message).not.toMatch(/nota-privada|secret|token=/); }
});

test('HTTP 409 e cancelamento de navegação não viram erro de conectividade', async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(409));
  expect((await fetchApi(`${base}/areas`)).status).toBe(409);
  const error = new DOMException('Cancelado', 'AbortError');
  jest.mocked(fetch).mockRejectedValueOnce(error);
  await expect(fetchApi(`${base}/areas`)).rejects.toBe(error);
});

test('documento e anexos concorrentes compartilham uma renovação e usam os tokens novos', async () => {
  const { request, saveTokens } = session(); const refresh = deferred<Response>();
  jest.mocked(fetch).mockImplementation((url, init) => String(url).endsWith('/auth/refresh') ? refresh.promise : Promise.resolve(reply(auth(init) === 'Bearer expired' ? 401 : 200)));
  const requests = Promise.all([request(`${base}/areas`, {}, 'expired'), request(`${base}/attachments`, {}, 'expired')]);
  await waitFor(() => expect(jest.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1));
  refresh.resolve(reply(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }));
  expect((await requests).map(response => response.status)).toEqual([200, 200]);
  expect(saveTokens).toHaveBeenCalledTimes(1);
});

test('401 atrasado usa a rotação já concluída e não repete o refresh antigo', async () => {
  const { request } = session(); const slow = deferred<Response>();
  jest.mocked(fetch).mockImplementation((url, init) => {
    if (String(url).endsWith('/auth/refresh')) return Promise.resolve(reply(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }));
    if (String(url).endsWith('/slow') && auth(init) === 'Bearer expired') return slow.promise;
    return Promise.resolve(reply(auth(init) === 'Bearer expired' ? 401 : 200));
  });
  const late = request(`${base}/slow`, {}, 'expired');
  expect((await request(`${base}/fast`, {}, 'expired')).status).toBe(200);
  slow.resolve(reply(401)); expect((await late).status).toBe(200);
  expect(jest.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
});

test('cancelar uma consulta não cancela a renovação compartilhada por outra', async () => {
  const { request } = session(); const refresh = deferred<Response>(); const controller = new AbortController();
  jest.mocked(fetch).mockImplementation((url, init) => {
    if (init?.signal?.aborted) return Promise.reject(init.signal.reason);
    if (String(url).endsWith('/auth/refresh')) return refresh.promise;
    return Promise.resolve(reply(auth(init) === 'Bearer expired' ? 401 : 200));
  });
  const first = request(`${base}/areas`, { signal: controller.signal }, 'expired');
  const second = request(`${base}/attachments`, {}, 'expired');
  const results = Promise.allSettled([first, second]);
  await waitFor(() => expect(jest.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1));
  controller.abort(); refresh.resolve(reply(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }));
  const completed = await results;
  expect(completed[0]).toMatchObject({ status: 'rejected', reason: { name: 'AbortError' } });
  expect(completed[1]).toMatchObject({ status: 'fulfilled', value: { status: 200 } });
});

test('logout durante refresh impede restaurar uma sessão antiga', async () => {
  const { request, state, saveTokens } = session(); const refresh = deferred<Response>();
  jest.mocked(fetch).mockImplementation(url => String(url).endsWith('/auth/refresh') ? refresh.promise : Promise.resolve(reply(401)));
  const pending = request(`${base}/areas`, {}, 'expired');
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  state.access = undefined; state.refresh = undefined;
  refresh.resolve(reply(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }));
  expect((await pending).status).toBe(401); expect(saveTokens).not.toHaveBeenCalled();
});

test('refresh recusado não apaga dados locais nem tenta novamente indefinidamente', async () => {
  const { request, state, saveTokens } = session(); jest.mocked(fetch).mockResolvedValue(reply(401));
  expect((await request(`${base}/areas`, {}, 'expired')).status).toBe(401);
  expect(fetch).toHaveBeenCalledTimes(2); expect(state.refresh).toBe('old-refresh'); expect(saveTokens).not.toHaveBeenCalled();
});
