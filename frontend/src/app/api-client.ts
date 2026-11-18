export type AuthTokens = { accessToken: string; refreshToken: string };

export function resolveApiUrl(configured?: string) {
  // An explicit environment must never silently send a local session to another API.
  return configured?.trim().replace(/\/+$/, '') || 'https://biblioteca-de-estudos.onrender.com';
}

export class ApiNetworkError extends TypeError {
  readonly code = 'API_NETWORK_ERROR';
  readonly endpoint: string;
  readonly cause: unknown;
  constructor(url: string, method: string, cause: unknown) {
    const endpoint = new URL(url);
    const address = endpoint.origin + endpoint.pathname;
    super(`Não foi possível conectar à API em ${address} (${method}). Verifique a conexão com o servidor e tente novamente.`);
    this.name = 'ApiNetworkError'; this.endpoint = address; this.cause = cause;
  }
}

export async function fetchApi(url: string, init: RequestInit = {}): Promise<Response> {
  try { return await fetch(url, init); }
  catch (error) {
    // Navigation cancellation is not a connectivity failure.
    if (error instanceof TypeError && !init.signal?.aborted) throw new ApiNetworkError(url, init.method ?? 'GET', error);
    throw error;
  }
}

type Authentication = {
  apiUrl: string;
  getAccessToken: () => string | undefined;
  getRefreshToken: () => string | undefined;
  saveTokens: (tokens: AuthTokens) => void;
};

export function createAuthenticatedFetch(auth: Authentication) {
  let refresh: { token: string; promise: Promise<string | undefined> } | undefined;
  let lastRotation: { from: string | undefined; to: string } | undefined;
  const renew = (token: string): Promise<string | undefined> => {
    if (refresh?.token === token) return refresh.promise;
    const pending = {
      token,
      promise: (async () => {
        const response = await fetchApi(`${auth.apiUrl}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: token }) });
        if (!response.ok) return undefined;
        const tokens: unknown = await response.json();
        if (!tokens || typeof tokens !== 'object' || !('accessToken' in tokens) || !('refreshToken' in tokens) || typeof tokens.accessToken !== 'string' || typeof tokens.refreshToken !== 'string' || !tokens.accessToken || !tokens.refreshToken) throw new Error('Resposta inválida ao renovar a sessão. Tente entrar novamente.');
        // A response started by a previous account/logout must not replace this session.
        if (auth.getRefreshToken() !== token) return undefined;
        lastRotation = { from: auth.getAccessToken(), to: tokens.accessToken };
        auth.saveTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        return tokens.accessToken;
      })(),
    };
    refresh = pending;
    void pending.promise.finally(() => { if (refresh === pending) refresh = undefined; }).catch(() => {});
    return pending.promise;
  };
  return async (url: string, init: RequestInit, fallbackToken: string): Promise<Response> => {
    const token = auth.getAccessToken() ?? fallbackToken;
    const send = (accessToken: string) => {
      // RequestInit accepts objects, tuples and Headers. Normalize before adding
      // authorization so differently-cased keys never become two Bearer values.
      const headers = Object.fromEntries(new Headers(init.headers).entries());
      delete headers.authorization;
      return fetchApi(url, { ...init, headers: { ...headers, Authorization: `Bearer ${accessToken}` } });
    };
    const response = await send(token);
    if (response.status !== 401) return response;
    // Another request may already have rotated the tokens before this 401 arrived.
    const current = auth.getAccessToken();
    if (current && current !== token) return lastRotation?.from === token && lastRotation.to === current ? send(current) : response;
    const refreshToken = auth.getRefreshToken();
    if (!refreshToken) return response;
    const renewed = await renew(refreshToken);
    if (!renewed || auth.getAccessToken() !== renewed) return response;
    return send(renewed); // One retry only; an aborted caller does not cancel the shared refresh.
  };
}
