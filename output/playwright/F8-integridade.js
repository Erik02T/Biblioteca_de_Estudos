// Execute with Playwright browser_run_code_unsafe(filename=...). Fixtures only.
async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3028') throw Error('F8 requires the isolated frontend on 3028');
  const api = 'http://localhost:3027';
  const results = {};
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const title = p => p.getByRole('textbox', { name: 'Nome da página' });
  const editor = p => p.getByRole('textbox', { name: 'Conteúdo da página' });
  const remote = async p => p.evaluate(async base => {
    const r = await fetch(base + '/areas/' + new URL(location.href).searchParams.get('page'), { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!r.ok) throw Error('Fixture read: ' + r.status);
    return r.json();
  }, api);
  const waitRemote = async (p, name, text) => {
    await p.waitForFunction(async ({ base, name, text }) => {
      const r = await fetch(base + '/areas/' + new URL(location.href).searchParams.get('page'), { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
      if (!r.ok) return false;
      const value = await r.json();
      return value.nome === name && (!text || JSON.stringify(value.conteudo).includes(text));
    }, { base: api, name, text });
    await p.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
  };
  await page.evaluate(async base => {
    const r = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'f8-browser-' + crypto.randomUUID() + '@example.com', password: 'F8-fixture-12345' }) });
    if (r.status !== 201) throw Error('Fixture register: ' + r.status);
    const t = await r.json();
    localStorage.setItem('biblioteca-access-token', t.accessToken); localStorage.setItem('biblioteca-refresh-token', t.refreshToken);
  }, api);
  await page.goto('http://localhost:3028/');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('link', { name: 'Idiomas', exact: true }).click();
  await page.getByRole('button', { name: '+ Nova página', exact: true }).click();
  await title(page).fill('F8 resposta perdida');
  await editor(page).fill('Texto inicial 日本語');
  let committedId;
  let attempts = 0;
  await page.route(api + '/areas', async route => {
    if (route.request().method() === 'POST' && ++attempts === 1) {
      const response = await route.fetch(); committedId = (await response.json()).id;
      await route.abort('failed'); return;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Criar página', exact: true }).click();
  await page.getByTestId('save-status').filter({ hasText: /Atenção/ }).waitFor();
  await title(page).fill('F8 edição posterior');
  await page.getByRole('button', { name: 'Criar página', exact: true }).click();
  await page.waitForURL(/\?page=/);
  await waitRemote(page, 'F8 edição posterior', 'Texto inicial');
  await page.unroute(api + '/areas');
  assert(new URL(page.url()).searchParams.get('page') === committedId && attempts === 2, 'Duplicate creation after lost response');
  const total = await page.evaluate(async base => (await (await fetch(base + '/areas', { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } })).json()).pagination.total, api);
  assert(total === 1, 'Creation produced more than one page');
  results.lostCreationResponse = { passed: true, attempts, onePage: total === 1 };

  // Commit an autosave upstream, hold its response, then edit both fields again.
  let release;
  const held = new Promise(done => { release = done; });
  let firstStarted;
  const started = new Promise(done => { firstStarted = done; });
  let writes = 0;
  await page.route(api + '/areas/**', async route => {
    if (route.request().method() === 'PATCH' && ++writes === 1) {
      const response = await route.fetch(); firstStarted(); await held;
      await route.fulfill({ response }); return;
    }
    await route.continue();
  });
  await title(page).fill('F8 primeira escrita');
  await started;
  await title(page).fill('F8 última escrita');
  await editor(page).fill('Último conteúdo da fila 日本語');
  release();
  await waitRemote(page, 'F8 última escrita', 'Último conteúdo');
  await page.unroute(api + '/areas/**');
  assert(writes === 2, 'Unified queue did not serialize the newest snapshot');
  results.delayedContentAndMetadata = { passed: true, writes };

  await page.route(api + '/areas/**', route => route.request().method() === 'PATCH' ? route.abort('failed') : route.continue());
  await title(page).fill('F8 recuperação local');
  await editor(page).fill('Rascunho recuperável 日本語');
  await page.getByTestId('save-status').filter({ hasText: /Atenção/ }).waitFor();
  await page.unroute(api + '/areas/**');
  const address = page.url();
  const reopened = await page.context().newPage();
  await page.close(); // Discard JS memory, keep the browser's IndexedDB/profile.
  page = reopened;
  await page.goto(address);
  await page.getByRole('button', { name: 'Abrir recuperação', exact: true }).waitFor();
  assert(await title(page).inputValue() === 'F8 última escrita', 'Recovery overwrote remote state without consent');
  await page.getByRole('button', { name: 'Abrir recuperação', exact: true }).click();
  await page.getByRole('button', { name: 'Recuperar para edição', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="Nome da página"]')?.value === 'F8 recuperação local');
  await waitRemote(page, 'F8 recuperação local', 'Rascunho recuperável');
  results.documentRestartRecovery = { passed: true, scope: 'closed document and reopened page, not OS/browser-process restart' };

  const other = await page.context().newPage();
  await other.goto(address); await title(other).waitFor();
  await title(page).fill('F8 vencedora');
  await waitRemote(page, 'F8 vencedora', 'Rascunho recuperável');
  await editor(other).fill('Edição da outra aba preservada');
  await other.getByRole('button', { name: 'Baixar rascunho atual', exact: true }).waitFor();
  assert(!(JSON.stringify((await remote(page)).conteudo).includes('outra aba')), 'Stale tab overwrote remote content');
  await other.screenshot({ path: 'output/playwright/F8-conflito-abas.png', fullPage: true });
  await other.close();
  await page.reload();
  await page.getByRole('button', { name: 'Abrir recuperação', exact: true }).click();
  await page.getByRole('button', { name: 'Recuperar para edição', exact: true }).click();
  await page.getByText('A página remota mudou. Baixe o rascunho para comparar; a recuperação não sobrescreve a versão atual.', { exact: true }).waitFor();
  assert(await title(page).inputValue() === 'F8 vencedora', 'Conflicting draft replaced remote state');
  results.tabsAndDivergentRecovery = { passed: true };

  await page.evaluate(async base => {
    sessionStorage.setItem('f8-fixture-account-a', JSON.stringify({ accessToken: localStorage.getItem('biblioteca-access-token'), refreshToken: localStorage.getItem('biblioteca-refresh-token') }));
    const r = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'f8-browser-b-' + crypto.randomUUID() + '@example.com', password: 'F8-fixture-12345' }) });
    if (r.status !== 201) throw Error('Fixture account B: ' + r.status);
    const t = await r.json(); localStorage.setItem('biblioteca-access-token', t.accessToken); localStorage.setItem('biblioteca-refresh-token', t.refreshToken);
    window.dispatchEvent(new StorageEvent('storage', { key: 'biblioteca-access-token' }));
  }, api);
  await page.getByRole('alert').filter({ hasText: 'Página indisponível ou sem acesso.' }).waitFor();
  assert(await page.getByRole('region', { name: 'Rascunhos locais', exact: true }).count() === 0 && await title(page).count() === 0, 'Account B saw account A state');
  await page.evaluate(() => {
    const t = JSON.parse(sessionStorage.getItem('f8-fixture-account-a'));
    localStorage.setItem('biblioteca-access-token', t.accessToken); localStorage.setItem('biblioteca-refresh-token', t.refreshToken);
    sessionStorage.removeItem('f8-fixture-account-a'); window.dispatchEvent(new StorageEvent('storage', { key: 'biblioteca-access-token' }));
  });
  await page.getByRole('region', { name: 'Rascunhos locais', exact: true }).waitFor();
  results.accountIsolation = { passed: true };
  await page.screenshot({ path: 'output/playwright/F8-recuperacao-conta-a.png', fullPage: true });
  const referenced = await page.evaluate(async base => {
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') };
    const create = async data => {
      const response = await fetch(base + '/areas', { method: 'POST', headers, body: JSON.stringify({ section: 'OUTROS', subSection: 'ESTUDANDO', nome: 'F8 destino', categoria: 'Geral', conteudo: { type: 'doc', content: [{ type: 'paragraph' }] }, ...data }) });
      if (response.status !== 201) throw Error('Reference fixture: ' + response.status);
      return response.json();
    };
    const target = await create({});
    const source = await create({ nome: 'F8 origem', targetPageId: target.id, icone: null });
    const removed = await fetch(base + '/areas/' + target.id, { method: 'DELETE', headers });
    if (!removed.ok) throw Error('Reference fixture deletion failed');
    return { id: source.id, target: target.id };
  }, api);
  await page.goto('http://localhost:3028/?page=' + referenced.id);
  await title(page).fill('F8 referência preservada');
  await editor(page).fill('Salvar sem reenviar metadados inalterados 日本語');
  await waitRemote(page, 'F8 referência preservada', 'Salvar sem reenviar');
  const preserved = await remote(page);
  assert(preserved.targetPageId === referenced.target && preserved.icone === null, 'Untouched metadata changed');
  results.unchangedMetadata = { passed: true, deletedReferenceDidNotBlockSave: true, legacyNullIconPreserved: true };
  const deniedStatus = await page.evaluate(async base => (await fetch(base + '/areas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer deliberately-invalid' }, body: '{}' })).status, api);
  assert(deniedStatus === 401, '401 was hidden from the browser by CORS');
  results.readableUnauthorizedWrite = { passed: true, status: deniedStatus };
  return { browser: page.context().browser()?.version(), results };
}
