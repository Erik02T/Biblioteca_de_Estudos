import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { requireTestDatabase } from './common/test-environment';
import { createAuthenticatedFetch } from '../../frontend/src/app/api-client';

describe('F8 — bootstrap real: CORS antes da pré-autorização do body', () => {
  let child: ChildProcess;
  let base: string;
  beforeAll(async () => {
    requireTestDatabase();
    const port = await new Promise<number>((done) => {
      const server = createServer();
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string')
          throw Error('Porta de fixture inválida');
        server.close(() => done(address.port));
      });
    });
    base = `http://127.0.0.1:${port}`;
    child = spawn(
      process.execPath,
      [resolve(__dirname, '../dist/src/main.js')],
      {
        cwd: resolve(__dirname, '..'),
        env: {
          ...process.env,
          PORT: String(port),
          FRONTEND_URL: 'http://localhost:3028',
        },
        windowsHide: true,
        stdio: 'ignore',
      },
    );
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null)
        throw Error('Bootstrap isolado encerrou antes da prontidão');
      try {
        if ((await fetch(base + '/health/ready')).ok) return;
      } catch {
        /* Wait for this process only. */
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    throw Error('API de fixture não iniciou em 6 segundos');
  }, 15_000);
  afterAll(async () => {
    if (child && child.exitCode === null)
      await new Promise<void>((done) => {
        child.once('exit', () => done());
        child.kill('SIGTERM');
      });
  });

  it('401 de POST/PATCH inválidos mantém CORS antes de consumir o body', async () => {
    for (const method of ['POST', 'PATCH']) {
      const response = await fetch(
        base + '/areas' + (method === 'PATCH' ? '/' + randomUUID() : ''),
        {
          method,
          headers: {
            Origin: 'http://localhost:3028',
            Authorization: 'Bearer deliberately-invalid',
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
      );
      expect(response.status).toBe(401);
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'http://localhost:3028',
      );
      expect(await response.json()).toMatchObject({ statusCode: 401 });
    }
  });

  it('preflight mantém aliases e permite o header de idempotência sem abrir origens arbitrárias', async () => {
    const response = await fetch(base + '/areas', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:3028',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers':
          'authorization,content-type,idempotency-key',
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://127.0.0.1:3028',
    );
    expect(response.headers.get('access-control-allow-headers')).toContain(
      'idempotency-key',
    );
    const denied = await fetch(base + '/areas', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://not-an-allowed-origin.example',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('cliente efetivo renova token realmente expirado e conclui a criação no bootstrap real', async () => {
    const registered = await fetch(base + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `f8-bootstrap-${randomUUID()}@example.com`,
        password: 'F8-fixture-12345',
      }),
    });
    expect(registered.status).toBe(201);
    const tokens = (await registered.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const claims = jwt.decode<{ sub: string; email: string; sid: string }>(
      tokens.accessToken,
    );
    const expired = await jwt.signAsync(
      { sub: claims.sub, email: claims.email, sid: claims.sid },
      { expiresIn: -1 },
    );
    const store = { access: expired, refresh: tokens.refreshToken };
    const client = createAuthenticatedFetch({
      apiUrl: base,
      getAccessToken: () => store.access,
      getRefreshToken: () => store.refresh,
      saveTokens: (value) => {
        store.access = value.accessToken;
        store.refresh = value.refreshToken;
      },
    });
    const response = await client(
      base + '/areas',
      {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:3028',
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify({
          section: 'OUTROS',
          subSection: 'ESTUDANDO',
          nome: 'Token renovado',
          categoria: 'Geral',
        }),
      },
      expired,
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:3028',
    );
    expect(store.access).not.toBe(expired);
    expect(await response.json()).toMatchObject({
      userId: claims.sub,
      nome: 'Token renovado',
    });
  });
});
