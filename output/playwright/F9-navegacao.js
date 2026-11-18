// Run via playwright-cli -s=f9 run-code --filename output/playwright/F9-navegacao.js.
async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3028') throw Error('Use isolated frontend 3028');
  const api = 'http://localhost:3027';
  const assert = (value, message) => { if (!value) throw Error(message); };
  const title = () => page.getByRole('textbox', { name: 'Nome da página' });
  const body = () => page.getByRole('textbox', { name: 'Conteúdo da página' });
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
  const results = {};
  const remote = id => page.evaluate(async ({ api, id }) => {
    const r = await fetch(api + '/areas/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!r.ok) throw Error('Fixture read ' + r.status);
    return r.json();
  }, { api, id });
  const ids = await page.evaluate(async api => {
    const auth = await fetch(api + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'f9-' + crypto.randomUUID() + '@example.com', password: 'F9-fixture-12345' }) });
    if (auth.status !== 201) throw Error('Fixture registration ' + auth.status);
    const tokens = await auth.json();
    localStorage.setItem('biblioteca-access-token', tokens.accessToken);
    localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken);
    const create = async (nome, parentId = null, subSection = 'ESTUDANDO') => {
      const r = await fetch(api + '/areas', { method: 'POST', headers: { Authorization: 'Bearer ' + tokens.accessToken, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ section: 'LINGUAGENS', subSection, nome, parentId, categoria: 'Geral', nivelEntendimento: 1, icone: '📖', conteudo: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Conteúdo de ' + nome }] }] } }) });
      if (r.status !== 201) throw Error('Fixture page ' + r.status);
      return (await r.json()).id;
    };
    const root = await create('Japonês');
    const child = await create('Partículas', root, 'ESTUDADO');
    const leaf = await create('は e が', child);
    const destination = await create('Gramática');
    return { root, child, leaf, destination };
  }, api);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3028/?page=' + ids.leaf);
  await title().waitFor();
  const tree = page.getByRole('region', { name: 'Árvore de páginas' });
  await tree.getByRole('link', { name: /は e が/ }).waitFor();
  assert(await tree.getByRole('link').count() === 4, 'Missing or duplicated tree IDs');
  assert(await tree.getByRole('link', { name: /は e が/ }).getAttribute('aria-current') === 'page', 'Selected item missing');
  const breadcrumb = page.getByRole('navigation', { name: 'Caminho da página' });
  assert((await breadcrumb.innerText()).includes('Partículas'), 'Filtered ancestor missing');
  await title().fill('は e が — exemplos');
  await title().press('Enter');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Conteúdo da página');
  await body().fill('Exemplos preservados 日本語');
  await breadcrumb.getByRole('link', { name: 'Partículas', exact: true }).click();
  await page.waitForURL('**/?page=' + ids.child);
  await title().waitFor();
  const persisted = await remote(ids.leaf);
  assert(persisted.nome === 'は e が — exemplos' && JSON.stringify(persisted.conteudo).includes('Exemplos preservados 日本語'), 'Navigation lost pending title/body');
  await page.goBack();
  await page.waitForURL('**/?page=' + ids.leaf);
  await title().waitFor();
  assert(await title().inputValue() === persisted.nome, 'Back lost title');
  await page.goForward();
  await page.waitForURL('**/?page=' + ids.child);
  await title().waitFor();
  results.threeLevelsAndHistory = true;

  // Move the branch using the product, across different study statuses.
  await page.getByRole('button', { name: 'Propriedades', exact: true }).click();
  const parent = page.getByRole('combobox', { name: 'Página mãe', exact: true });
  assert(!await parent.locator('option[value="' + ids.leaf + '"]').count(), 'Descendant offered as parent');
  await parent.selectOption(ids.destination);
  await page.getByRole('button', { name: 'Aplicar alterações', exact: true }).click();
  await saved();
  await page.getByRole('button', { name: 'Fechar ferramenta' }).click();
  assert((await remote(ids.child)).parentId === ids.destination, 'Branch move not persisted');
  assert((await remote(ids.leaf)).parentId === ids.child, 'Move detached descendant');
  await page.reload(); await title().waitFor();
  await page.getByRole('navigation', { name: 'Caminho da página' }).getByRole('link', { name: 'Gramática', exact: true }).waitFor();
  results.branchMoveAndReload = true;

  // Direct child creation preselects title, then Enter starts the document.
  await page.getByRole('button', { name: 'Mais opções da página' }).click();
  await page.getByRole('menuitem', { name: 'Nova subpágina' }).click();
  await page.getByRole('button', { name: 'Criar página', exact: true }).waitFor();
  assert(await title().evaluate(element => element === document.activeElement && element.selectionEnd > element.selectionStart), 'New title not selected');
  await title().fill('Exercícios'); await title().press('Enter');
  await body().fill('Escrever sem preencher propriedades');
  await page.getByRole('button', { name: 'Criar página', exact: true }).click();
  await page.waitForFunction(previous => new URL(location.href).searchParams.get('page') !== previous, ids.child);
  await saved();
  const newId = new URL(page.url()).searchParams.get('page');
  assert((await remote(newId)).parentId === ids.child, 'Quick child creation lost parent');
  results.quickChild = true;

  // Focus and tools preserve the actual Tiptap DOM and its document.
  const dom = await body().elementHandle();
  await page.getByRole('button', { name: 'Modo foco', exact: true }).click();
  assert(await body().evaluate(element => element === document.activeElement), 'Focus mode did not focus document');
  await body().press('Escape');
  assert(await page.getByTestId('editor-root').getAttribute('data-focus-mode') === 'false', 'Escape left focus mode active');
  assert(new URL(page.url()).searchParams.get('page') === newId, 'Escape left document');
  await page.getByRole('button', { name: 'Propriedades', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar ferramenta' }).click();
  assert(await body().evaluate((element, previous) => element === previous, dom), 'Tools remounted Tiptap');
  results.focusAndTools = true;

  results.reflow = [];
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole('button', { name: 'Propriedades', exact: true }).click();
    await page.getByRole('dialog', { name: 'Propriedades' }).waitFor();
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert(dimensions.content <= dimensions.viewport, 'Horizontal overflow at ' + width + ': ' + JSON.stringify(dimensions));
    await page.screenshot({ path: 'output/playwright/F9-' + width + '.png', fullPage: true });
    await page.getByRole('button', { name: 'Fechar ferramenta' }).click();
    results.reflow.push({ width, ...dimensions });
  }

  // Rejected save must block both a breadcrumb and browser back.
  await page.route(api + '/areas/**', route => route.request().method() === 'PATCH' ? route.abort('failed') : route.continue());
  await title().fill('Rascunho F9 sem rede');
  await page.getByRole('navigation', { name: 'Caminho da página' }).getByRole('link', { name: 'Partículas', exact: true }).click();
  await page.getByTestId('save-status').filter({ hasText: /Atenção/ }).waitFor();
  assert(new URL(page.url()).searchParams.get('page') === newId, 'Failed save allowed breadcrumb navigation');
  assert(await title().inputValue() === 'Rascunho F9 sem rede', 'Failed navigation lost title');
  await page.goBack();
  await page.waitForURL('**/?page=' + newId);
  assert(await title().inputValue() === 'Rascunho F9 sem rede', 'Failed browser back lost title');
  await page.unroute(api + '/areas/**');
  await page.getByRole('button', { name: 'Salvar e voltar', exact: true }).click();
  await page.getByRole('heading', { name: 'Rascunho F9 sem rede', exact: true }).waitFor();
  assert((await remote(newId)).nome === 'Rascunho F9 sem rede', 'Retry did not persist draft');
  results.failedSaveGuard = true;
  return results;
}
