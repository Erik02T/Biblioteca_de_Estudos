async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3058') throw Error('Use isolated F11 frontend');
  const results = [], errors = [];
  const onError = error => errors.push(error.message); page.on('pageerror', onError);
  const check = (name, condition, detail) => { if (!condition) throw Error(name + ': ' + JSON.stringify(detail)); results.push({ name, passed: true, detail }); };
  const fixture = await page.evaluate(() => JSON.parse(localStorage.getItem('f11-fixture')));
  const targetId = fixture.ids[2];
  await page.goto('http://localhost:3058/?view=all&categoria=Integra%C3%A7%C3%A3o&layout=TABLE&order=nome&direction=asc');
  await page.locator(`tr[data-page-id="${targetId}"]`).waitFor();
  for (const width of [320, 375, 720, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const layout of ['LIST', 'TABLE', 'BOARD']) {
      await page.getByRole('combobox', { name: 'Visualização:', exact: true }).selectOption(layout);
      if (layout === 'TABLE') await page.locator(`tr[data-page-id="${targetId}"]`).waitFor();
      else if (layout === 'BOARD') await page.locator(`article[data-page-id="${targetId}"]`).waitFor();
      else await page.getByRole('heading', { name: 'Estudo F11 02 revisado', exact: true }).waitFor();
      const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, tableViewport: document.querySelector('.table-scroll')?.clientWidth, tableContent: document.querySelector('.table-scroll')?.scrollWidth }));
      check(`${layout} em ${width}px sem overflow da página`, sizes.document <= sizes.viewport + 1, sizes);
      if (width === 320 || width === 1440) await page.screenshot({ path: `output/playwright/F11-${layout}-${width}.png`, fullPage: true });
    }
  }
  await page.getByRole('combobox', { name: 'Visualização:', exact: true }).selectOption('TABLE');
  const row = page.locator(`tr[data-page-id="${targetId}"]`);
  const title = row.locator('input').first();
  await title.fill('Estudo F11 02 final');
  const favoriteResponse = page.waitForResponse(response => response.url().endsWith('/areas/' + targetId) && response.request().method() === 'PATCH' && response.status() === 200);
  await row.getByRole('button', { name: 'Desfavoritar Estudo F11 02 revisado', exact: true }).click();
  const favorite = await (await favoriteResponse).json();
  await row.getByRole('button', { name: 'Favoritar Estudo F11 02 revisado', exact: true }).waitFor();
  check('Favoritar preserva o título ainda digitado', await title.inputValue() === 'Estudo F11 02 final');
  const savedResponse = page.waitForResponse(response => response.url().endsWith('/areas/' + targetId) && response.request().method() === 'PATCH' && response.status() === 200);
  await row.getByRole('button', { name: 'Salvar propriedades', exact: true }).click();
  const saved = await savedResponse;
  check('Edição usa revisão confirmada do favorito sem conflito próprio', saved.request().postDataJSON().updatedAt === favorite.updatedAt);
  await row.getByRole('textbox', { name: 'Título de Estudo F11 02 final', exact: true }).waitFor();
  await title.fill('Rascunho preservado no conflito F11');
  await page.evaluate(async id => {
    const headers = { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token'), 'Content-Type': 'application/json' };
    const read = await fetch('http://localhost:3057/areas/' + id, { headers }); const page = await read.json();
    const write = await fetch('http://localhost:3057/areas/' + id, { method: 'PATCH', headers, body: JSON.stringify({ updatedAt: page.updatedAt, nivelEntendimento: 4 }) });
    if (!write.ok) throw Error('Induced concurrent update: ' + write.status);
  }, targetId);
  await row.getByRole('button', { name: 'Salvar propriedades', exact: true }).click();
  await row.getByRole('alert').waitFor();
  check('Conflito real mantém o rascunho da tabela', await title.inputValue() === 'Rascunho preservado no conflito F11');
  await row.getByRole('button', { name: 'Recarregar propriedades', exact: true }).click();
  await page.waitForFunction(id => document.querySelector(`tr[data-page-id="${id}"] input`)?.value === 'Estudo F11 02 final', targetId);
  check('Recarregar explicitamente recupera propriedades remotas', await row.getByRole('combobox', { name: 'Nível de Estudo F11 02 final', exact: true }).inputValue() === '4');
  await title.focus(); await page.keyboard.press('Tab');
  check('Tabela permite navegação por teclado entre campos', await row.locator('input').nth(1).evaluate(input => input === document.activeElement));
  await page.evaluate(async fixture => {
    const headers = { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token'), 'Content-Type': 'application/json' };
    const read = await fetch('http://localhost:3057/areas/' + fixture.source, { headers }); const source = await read.json();
    const model = await fetch('http://localhost:3057/templates/from-page', { method: 'POST', headers, body: JSON.stringify({ pageId: source.id, updatedAt: source.updatedAt, name: 'Modelo para reflow F11', type: 'NOTE' }) });
    if (!model.ok) throw Error('Preview fixture: ' + model.status);
  }, fixture);
  await page.setViewportSize({ width: 320, height: 960 });
  await page.getByRole('button', { name: 'Modelos', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Modelos de páginas', exact: true });
  await dialog.getByRole('button', { name: /Modelo para reflow F11/ }).click();
  await dialog.getByRole('heading', { name: 'Conteúdo para modelo F11', exact: true }).waitFor();
  check('Galeria de modelos cabe em 320px', await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
  await page.screenshot({ path: 'output/playwright/F11-modelos-320.png', fullPage: true });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  check('Escape fecha a galeria e devolve foco ao acionador', await page.getByRole('button', { name: 'Modelos', exact: true }).evaluate(button => button === document.activeElement));
  check('Nenhum erro de execução nos fluxos finais', errors.length === 0, errors);
  page.off('pageerror', onError);
  return { results, errors };
}
