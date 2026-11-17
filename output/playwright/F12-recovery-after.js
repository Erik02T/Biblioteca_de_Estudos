async (page) => {
  const { api, web, fixture, engine, account } = __F12_SETTINGS__;
  const id = fixture.ids[12];
  const checks = [];
  try {
    await page.goto(web);
    // A forced exit need not flush localStorage authentication or test markers.
    // Reconfirm the intended owner, then inspect its committed IndexedDB journal.
    const login = await page.request.post(api + '/auth/login', { data: { email: account.email, password: account.password } });
    if (!login.ok()) throw Error('Recovery identity login ' + login.status());
    const tokens = await login.json();
    await page.evaluate(tokens => { localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken); }, tokens);
    await page.goto(web + '/?page=' + id);
    const marker = await page.evaluate(async ({ owner, id }) => {
      const database = await new Promise((resolve, reject) => { const request = indexedDB.open('biblioteca-drafts-v1', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const records = await new Promise((resolve, reject) => { const tx = database.transaction('drafts', 'readonly'); const request = tx.objectStore('drafts').getAll(); let rows; request.onsuccess = () => { rows = request.result; }; tx.oncomplete = () => resolve(rows); tx.onerror = () => reject(tx.error); }); database.close();
      return records.filter(row => row.userId === owner && row.pageId === id).sort((a,b) => b.savedAt.localeCompare(a.savedAt))[0]?.snapshot.nome;
    }, { owner: account.id, id });
    if (!marker?.startsWith('F12 recuperação após processo encerrado ' + engine)) throw Error('No committed recovery draft for the confirmed owner');
    const drafts = page.getByRole('region', { name: 'Rascunhos locais', exact: true });
    await drafts.getByText(marker, { exact: false }).waitFor();
    checks.push('Rascunho confirmado persiste após encerramento forçado do processo de teste');
    await drafts.locator('li').filter({ hasText: marker }).getByRole('button', { name: 'Abrir recuperação', exact: true }).first().click();
    await page.getByRole('button', { name: 'Recuperar para edição', exact: true }).click();
    await page.waitForFunction(marker => document.querySelector('[aria-label="Nome da página"]')?.value === marker, marker);
    await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
    const stored = await page.evaluate(async ({ api, id }) => { const response = await fetch(api + '/areas/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } }); if (!response.ok) throw Error('Read: ' + response.status); return response.json(); }, { api, id });
    if (stored.nome !== marker) throw Error('Explicit recovery was not confirmed by server');
    checks.push('Recuperação explícita compara revisão e confirma o texto por nova leitura do servidor');
    return { passed: true, stage: 'after-forced-process-exit', engine, checks, identityReconfirmed: true, marker, operatingSystemCrashTested: false };
  } catch (error) { return { passed: false, checks, failure: error.message }; }
}
