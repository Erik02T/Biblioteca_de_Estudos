// Run only against the isolated F7 server started on localhost:3017.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { unzipSync, strFromU8 } = require('fflate');
const fs = require('node:fs/promises');
const path = require('node:path');
if (process.env.F7_HTTP_TESTS !== '1') throw Error('Set F7_HTTP_TESTS=1 only for the isolated F7 server');
const base = 'http://localhost:3017';
async function request(route, token, body, method = 'POST') {
  return fetch(base + route, { method, headers: { ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
}
async function account() {
  const result = await request('/auth/register', null, { email: `f7-http-${randomUUID()}@example.com`, password: `F7-${randomUUID()}!` });
  assert.equal(result.status, 201);
  return (await result.json()).accessToken;
}
async function main() {
  const token = await account(), foreign = await account();
  const result = await request('/areas', token, { nome: 'F7 HTTP', categoria: 'Fixtures', section: 'LINGUAGENS', subSection: 'ESTUDANDO', conteudo: { texto: '日本語 via HTTP' } });
  assert.equal(result.status, 201); let page = await result.json();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS8sAAAAASUVORK5CYII=', 'base64');
  const form = new FormData(); form.append('areaId', page.id); form.append('file', new Blob([png], { type: 'image/png' }), 'imagem.png');
  const uploaded = await request('/attachments/upload', token, form); assert.equal(uploaded.status, 201);
  const attachment = await uploaded.json();
  const created = await request(`/areas/${page.id}/revisions`, token, { name: 'Via HTTP', updatedAt: page.updatedAt }); assert.equal(created.status, 201);
  const version = await created.json();
  const previewResponse = await request(`/areas/${page.id}/revisions/${version.id}`, token, undefined, 'GET'); assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json(); assert.equal(preview.files.length, 1); assert.equal(preview.files[0].storageKey, undefined);
  const image = await fetch(preview.files[0].url); assert.equal(image.status, 200); assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  assert.equal((await request(`/areas/${page.id}/revisions`, foreign, undefined, 'GET')).status, 404);
  assert.equal((await request('/exports', foreign, { ids: [page.id] })).status, 404);
  assert.equal((await request('/exports', null, { ids: [page.id] })).status, 401);
  assert.equal((await request('/exports', token, { ids: 'invalid' })).status, 400);
  assert.equal((await request(`/areas/${page.id}/revisions`, token, { name: 'Antiga', updatedAt: '2000-01-01T00:00:00Z' })).status, 409);
  const updated = await request(`/areas/${page.id}`, token, { updatedAt: page.updatedAt, conteudo: { texto: 'Atual' } }, 'PATCH'); assert.equal(updated.status, 200); page = await updated.json();
  assert.equal((await request(`/attachments/${attachment.id}`, token, undefined, 'DELETE')).status, 200);
  const restored = await request(`/areas/${page.id}/revisions/${version.id}/restore`, token, { updatedAt: page.updatedAt }); assert.equal(restored.status, 201); page = await restored.json();
  assert.equal(page.conteudo.texto, '日本語 via HTTP');
  const archive = await request('/exports', token, { ids: [page.id] }); assert.equal(archive.status, 201); assert.match(archive.headers.get('content-type'), /application\/zip/);
  const bytes = Buffer.from(await archive.arrayBuffer()), zip = unzipSync(bytes);
  assert.ok(strFromU8(zip[`pages/${page.id}/page.md`]).includes('日本語 via HTTP'));
  assert.equal((await request(`/areas/${page.id}`, token, undefined, 'GET')).status, 200);
  const output = path.resolve(__dirname, '../../.f7-artifacts'); await fs.mkdir(output, { recursive: true }); await fs.writeFile(path.join(output, 'http-smoke.zip'), bytes);
  console.log(JSON.stringify({ result: 'PASS', checks: ['multipart upload', 'signed snapshot media', 'cross-account 404', 'unauthenticated 401', 'DTO 400', 'stale revision 409', 'restore after delete', 'offline ZIP', 'persisted GET'], pageId: page.id }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
