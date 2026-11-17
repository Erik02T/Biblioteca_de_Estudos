async (page) => {
  const settings = __F12_SETTINGS__;
  const { api, web, fixture, account, engine } = settings;
  const checks = [], errors = [], unexpectedResponses = [];
  const errorListener = error => errors.push(error.message);
  const responseListener = response => { if (response.url().startsWith(api) && response.status() >= 500) unexpectedResponses.push({ status: response.status(), path: new URL(response.url()).pathname }); };
  page.on('pageerror', errorListener); page.on('response', responseListener);
  page.setDefaultTimeout(12000);
  const check = (name, condition, detail) => { if (!condition) throw Error(name + (detail ? ': ' + JSON.stringify(detail) : '')); checks.push({ name, passed: true }); };
  const body = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true });
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
  const request = (path, method = 'GET', payload) => page.evaluate(async ({ api, path, method, payload }) => {
    const response = await fetch(api + path, { method, headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token'), 'Content-Type': 'application/json' }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    const value = await response.json(); if (!response.ok) throw Error(method + ' ' + path + ': ' + response.status()); return value;
  }, { api, path, method, payload });
  try {
    await page.goto(web);
    await page.evaluate(async ({ api, account }) => {
      const response = await fetch(api + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password: account.password }) });
      if (!response.ok) throw Error('Fixture login: ' + response.status());
      const tokens = await response.json(); localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken);
    }, { api, account });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(web + '/?page=' + fixture.source); await body.waitFor();
    await body.getByRole('link').nth(1).waitFor();
    check('Documento misto abre com heading legado, tarefa, código, alternante e referências', await body.locator('h6').count() === 1 && await body.locator('pre code').textContent() === 'def estudo():\n    return "日本語"\n' && await body.getByRole('link').count() === 2);
    const original = await request('/areas/' + fixture.source);
    const title = page.getByRole('textbox', { name: 'Nome da página', exact: true });
    await title.fill('F12 ' + engine + ' jornada'); await saved();
    check('Título direto persiste pelo mesmo ID', (await request('/areas/' + fixture.source)).nome === 'F12 ' + engine + ' jornada');
    await body.locator('input[type=checkbox]').uncheck(); await saved();
    const taskChanged = await request('/areas/' + fixture.source);
    check('Checklist persiste sem alterar status ou entendimento', taskChanged.conteudo.content.find(node => node.type === 'taskList').content[0].attrs.checked === false && taskChanged.subSection === original.subSection && taskChanged.nivelEntendimento === original.nivelEntendimento);
    const commands = page.getByRole('group', { name: 'Comandos do documento', exact: true });
    await body.locator('h6').click();
    await commands.getByRole('button', { name: 'Ações do bloco', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Duplicar bloco', exact: true }).click(); await saved();
    check('Duplicação preserva bloco e cria identidade distinta', await body.locator('h6').count() === 2 && new Set((await request('/areas/' + fixture.source)).conteudo.content.filter(node => node.type === 'heading').map(node => node.attrs.id)).size === 2);
    await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();
    check('Desfazer recupera a estrutura anterior', await body.locator('h6').count() === 1);
    await body.click(); await body.press('Control+End'); await body.press('Enter'); await page.keyboard.type('/destaque');
    await page.getByRole('menuitem', { name: 'Destaque', exact: true }).click(); await page.keyboard.type('Destaque da jornada F12 日本語'); await saved();
    check('Comando slash insere destaque com texto japonês', JSON.stringify((await request('/areas/' + fixture.source)).conteudo).includes('Destaque da jornada F12 日本語'));
    await page.reload(); await body.waitFor();
    check('Recarga preserva conteúdo misto e japonês', (await body.innerText()).includes('Destaque da jornada F12 日本語') && await body.locator('h6').count() === 1);
    await page.goto(web + '/?page=' + fixture.ids[2]); await body.waitFor();
    const breadcrumb = page.getByRole('navigation', { name: 'Caminho da página' });
    check('Três níveis com status mistos mantêm ancestrais no caminho', await breadcrumb.getByRole('link').count() === 4);
    await page.goBack(); await body.waitFor();
    check('Voltar recupera página e documento por ID', new URL(page.url()).searchParams.get('page') === fixture.source && (await body.innerText()).includes('Destaque da jornada F12 日本語'));
    await page.goto(web + '/?section=LINGUAGENS&scope=ALL&layout=TABLE&order=nome&direction=asc');
    const row = page.locator(`tr[data-page-id="${fixture.ids[4]}"]`); await row.waitFor();
    await row.getByRole('textbox', { name: 'Categoria de F12 ' + engine + ' 04', exact: true }).fill('Integração F12');
    await row.getByRole('combobox', { name: 'Status de F12 ' + engine + ' 04', exact: true }).selectOption('ESTUDADO');
    const propertySave = page.waitForResponse(response => response.url().endsWith('/areas/' + fixture.ids[4]) && response.request().method() === 'PATCH' && response.status() === 200);
    await row.getByRole('button', { name: 'Salvar propriedades', exact: true }).click(); await propertySave;
    const changed = await request('/areas/' + fixture.ids[4]);
    check('Tabela grava categoria/status no mesmo ID', changed.categoria === 'Integração F12' && changed.subSection === 'ESTUDADO');
    await page.getByRole('combobox', { name: 'Visualização:', exact: true }).selectOption('BOARD');
    const card = page.locator(`article[data-page-id="${fixture.ids[4]}"]`); await card.waitFor();
    check('Quadro representa a alteração da tabela', await page.locator('.board-column').filter({ has: page.getByRole('heading', { name: /^Estudado \(/ }) }).locator(`[data-page-id="${fixture.ids[4]}"]`).count() === 1);
    await page.getByLabel('Categoria exata', { exact: true }).fill('Integração F12');
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await page.getByText('1 página', { exact: true }).waitFor();
    check('Filtros são aplicados antes da paginação', await page.locator('article[data-page-id]').count() === 1);
    await page.getByRole('textbox', { name: 'Nome da visualização', exact: true }).fill('Homologação F12 ' + engine + ' ' + Date.now());
    await page.getByRole('button', { name: 'Salvar como nova', exact: true }).click(); await page.getByText('Visualização salva.', { exact: true }).waitFor();
    await page.reload(); await card.waitFor();
    check('Visualização e consulta sobrevivem à recarga', new URL(page.url()).searchParams.get('categoria') === 'Integração F12');
    await page.screenshot({ path: `output/playwright/F12-${engine}-jornada.png`, fullPage: true });
    check('Jornada sem erro de execução ou HTTP 5xx inesperado', errors.length === 0 && unexpectedResponses.length === 0, { errors, unexpectedResponses });
    return { passed: true, browserVersion: page.context().browser()?.version(), checks, errors, unexpectedResponses };
  } catch (error) {
    await page.screenshot({ path: `output/playwright/F12-${engine}-jornada-falha.png`, fullPage: true });
    return { passed: false, checks, errors, unexpectedResponses, failure: error.message };
  } finally { page.off('pageerror', errorListener); page.off('response', responseListener); }
}
