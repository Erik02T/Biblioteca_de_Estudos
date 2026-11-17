async (page) => {
  const { api, web, fixture, engine } = __F12_SETTINGS__;
  const checks = [], errors = [];
  const listener = error => errors.push(error.message); page.on('pageerror', listener);
  page.setDefaultTimeout(10000);
  const body = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true });
  const check = (name, value) => { if (!value) throw Error(name); checks.push({ name, passed: true }); };
  const read = id => page.evaluate(async ({ api, id }) => {
    const response = await fetch(api + '/areas/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!response.ok) throw Error('Read: ' + response.status); return response.json();
  }, { api, id });
  try {
    for (const [kind, id] of [['legacy', fixture.legacy], ['legacyReference', fixture.legacyReference], ['versioned', fixture.versioned]]) {
      await page.goto(web + '/?page=' + id); await body.waitFor();
      if (kind === 'legacyReference') { await body.getByRole('link').waitFor(); check('Referência legada resolve o destino sem perder identidade', await body.getByRole('link').count() === 1); }
      await body.click(); await body.press('Control+End'); await body.press('Enter'); await page.keyboard.type('Round-trip F12 日本語 ' + kind);
      await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
      const stored = await read(id);
      check(kind + ': servidor retém texto editado', JSON.stringify(stored.conteudo).includes('Round-trip F12 日本語 ' + kind));
      if (kind === 'versioned') check('schemaVersion conhecido permanece no documento salvo', stored.conteudo.schemaVersion === 1);
      if (kind === 'legacyReference') check('Referência legada normaliza pageId para targetPageId', JSON.stringify(stored.conteudo).includes(fixture.ids[1]) && !JSON.stringify(stored.conteudo).includes('"pageId"'));
      await page.reload(); await body.waitFor();
      check(kind + ': reabrir preserva a edição', (await body.innerText()).includes('Round-trip F12 日本語 ' + kind));
    }
    for (const [kind, id] of [['unknownNode', fixture.unknownNode], ['unknownRoot', fixture.unknownRoot], ['future', fixture.future]]) {
      const before = await read(id);
      await page.goto(web + '/?page=' + id);
      await page.getByRole('region', { name: 'Conteúdo original preservado' }).waitFor();
      check(kind + ': corpo incompatível bloqueado com aviso', await body.count() === 0);
      const response = page.waitForResponse(response => response.url().endsWith('/areas/' + id) && response.request().method() === 'PATCH');
      await page.getByRole('textbox', { name: 'Nome da página', exact: true }).fill('F12 ' + engine + ' preservado ' + kind);
      const saved = await response;
      check(kind + ': alterar metadados não envia conteudo', saved.status() === 200 && !('conteudo' in saved.request().postDataJSON()));
      await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
      const after = await read(id);
      check(kind + ': JSON original permanece idêntico no servidor', JSON.stringify(before.conteudo) === JSON.stringify(after.conteudo));
    }
    check('Compatibilidade sem erro de execução', errors.length === 0);
    return { passed: true, checks, errors };
  } catch (error) { return { passed: false, checks, errors, failure: error.message }; }
  finally { page.off('pageerror', listener); }
}
