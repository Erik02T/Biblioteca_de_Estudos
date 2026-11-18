async (page) => {
  const { api, web, fixture, account, other, engine } = __F12_SETTINGS__;
  const checks = []; let second;
  const check = (name, value) => { if (!value) throw Error(name); checks.push({ name, passed: true }); };
  const id = fixture.ids[14];
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(web + '/?page=' + id);
    const title = page.getByRole('textbox', { name: 'Nome da página', exact: true }); await title.waitFor();
    let writes = 0; const observe = request => { if (request.url() === api + '/areas/' + id && request.method() === 'PATCH') writes++; }; page.on('request', observe);
    await page.evaluate(() => { window.f12OriginalIDBPut = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function() { throw new DOMException('F12 quota fixture', 'QuotaExceededError'); }; });
    await title.fill('F12 quota em memória ' + engine);
    await page.getByText('Não foi possível guardar o rascunho neste navegador. Mantenha a página aberta e tente salvar novamente.', { exact: true }).waitFor();
    check('Quota induzida mantém o texto em memória e impede escrita sem journal', await title.inputValue() === 'F12 quota em memória ' + engine && writes === 0);
    await page.evaluate(() => { IDBObjectStore.prototype.put = window.f12OriginalIDBPut; });
    await title.fill('F12 quota recuperada ' + engine); await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
    check('Armazenamento restabelecido permite salvar explicitamente a edição seguinte', writes === 1); page.off('request', observe);
    second = await page.context().newPage();
    await second.goto(web + '/?page=' + id); const secondTitle = second.getByRole('textbox', { name: 'Nome da página', exact: true }); await secondTitle.waitFor();
    await title.fill('F12 revisão A ' + engine); await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
    const conflicting = 'F12 rascunho B ' + engine;
    await secondTitle.fill(conflicting); await second.getByText('A versão remota mudou. Seu rascunho local foi preservado.', { exact: true }).waitFor();
    check('Duas abas produzem conflito real e preservam o rascunho', await secondTitle.inputValue() === conflicting);
    await second.close(); second = undefined;
    const initialTokens = await page.evaluate(() => ({ accessToken: localStorage.getItem('biblioteca-access-token'), refreshToken: localStorage.getItem('biblioteca-refresh-token') }));
    const identity = await page.evaluate(async ({ api, other }) => {
      const response = await fetch(api + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: other.email, password: other.password }) });
      if (!response.ok) throw Error('Other login ' + response.status());
      const tokens = await response.json(); localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken); return true;
    }, { api, other });
    await page.goto(web); await page.getByRole('button', { name: 'Sair', exact: true }).waitFor();
    check('Outra conta não recebe o rascunho da aba anterior', identity && !await page.getByRole('region', { name: 'Rascunhos locais', exact: true }).count() && !(await page.locator('body').innerText()).includes(conflicting));
    await page.evaluate(tokens => { localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken); }, initialTokens);
    await page.goto(web); await page.getByRole('region', { name: 'Rascunhos locais', exact: true }).getByText(conflicting, { exact: false }).waitFor();
    check('Conta original retoma seu próprio journal sem sobrescrever a revisão A', true);
    return { passed: true, checks, quota: 'injected QuotaExceededError in IDB put; no disk exhaustion', owner: account.id };
  } catch (error) { return { passed: false, checks, failure: error.message }; }
  finally { await second?.close(); await page.evaluate(() => { if (window.f12OriginalIDBPut) IDBObjectStore.prototype.put = window.f12OriginalIDBPut; }).catch(() => {}); }
}
