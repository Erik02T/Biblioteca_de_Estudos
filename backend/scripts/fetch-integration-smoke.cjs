// Only the isolated F7 API on 3017. No writes to the normal library.
if (process.env.F7_FETCH_TESTS !== '1') throw Error('Enable only for the isolated F7 API');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const base = 'http://localhost:3017';
const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/app/api-client.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleExports = {};
let refreshRequests = 0;
const trackedFetch = (url, init) => {
  if (String(url).endsWith('/auth/refresh')) refreshRequests++;
  return fetch(url, init);
};
new Function('exports', 'fetch', compiled)(moduleExports, trackedFetch);
async function main() {
  const register = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `fetch-smoke-${randomUUID()}@example.com`, password: `F7-${randomUUID()}!` }) });
  assert.equal(register.status, 201);
  const tokens = await register.json();
  const store = { access: tokens.accessToken, refresh: tokens.refreshToken };
  const request = moduleExports.createAuthenticatedFetch({ apiUrl: base, getAccessToken: () => store.access, getRefreshToken: () => store.refresh, saveTokens: value => { store.access = value.accessToken; store.refresh = value.refreshToken; } });
  const json = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const created = await request(base + '/areas', json({ nome: 'Fetch fixture', categoria: 'F7', section: 'LINGUAGENS', subSection: 'ESTUDANDO', conteudo: { texto: 'Fixture de integração' } }), store.access);
  assert.equal(created.status, 201); const page = await created.json();
  store.access = 'expired-diagnostic-token';
  const responses = await Promise.all([
    request(base + '/areas/' + page.id, {}, store.access),
    request(base + '/attachments?areaId=' + page.id, {}, store.access),
    request(base + '/areas?page=1&limit=20', {}, store.access),
  ]);
  assert.deepEqual(responses.map(response => response.status), [200, 200, 200]);
  assert.equal(refreshRequests, 1);
  const statuses = {};
  for (const endpoint of ['/templates', '/view-configurations', '/areas/search?q=Fetch', '/areas/trash']) {
    const response = await request(base + endpoint, {}, store.access);
    statuses[endpoint.split('?')[0]] = response.status; assert.equal(response.status, 200);
    await response.body?.cancel();
  }
  const version = await request(base + `/areas/${page.id}/revisions`, json({ name: 'Fetch snapshot', updatedAt: page.updatedAt }), store.access);
  assert.equal(version.status, 201);
  const archive = await request(base + '/exports', json({ ids: [page.id] }), store.access);
  assert.equal(archive.status, 201); assert.ok((await archive.arrayBuffer()).byteLength > 0);
  console.log(JSON.stringify({ result: 'PASS', concurrentStatus: responses.map(response => response.status), refreshRequests, statuses, snapshot: version.status, export: archive.status }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
