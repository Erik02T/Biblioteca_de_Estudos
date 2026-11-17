async (page) => {
  const { api, web, engine } = __F12_SETTINGS__;
  const checks = [];
  const request = (path, method = 'GET', body) => page.evaluate(async ({ api, path, method, body }) => {
    const response = await fetch(api + path, { method, headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token'), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const value = await response.json(); if (!response.ok) throw Error(method + ' ' + path + ' ' + response.status()); return value;
  }, { api, path, method, body });
  const create = (nome, parentId) => request('/areas', 'POST', { nome, parentId, categoria: 'F12 lixeira', section: 'OUTROS', subSection: 'ESTUDANDO', conteudo: { type: 'doc', content: [{ type: 'paragraph' }] } });
  const check = (name, value) => { if (!value) throw Error(name); checks.push({ name, passed: true }); };
  const card = name => page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) });
  try {
    await page.setViewportSize({ width: 1280, height: 720 });
    const root = await create('F12 ramo ' + engine + ' ' + Date.now());
    const child = await create('F12 filha já excluída ' + engine, root.id);
    await request('/areas/' + child.id, 'DELETE'); await request('/areas/' + root.id, 'DELETE');
    await page.goto(web + '/?view=trash');
    const rootCard = card(root.nome); await rootCard.waitFor(); await rootCard.locator('summary').click();
    await page.evaluate(() => { window.f12OriginalConfirm = window.confirm; window.confirm = () => true; });
    await rootCard.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await rootCard.waitFor({ state: 'detached' });
    const trash = await request('/areas/trash?limit=100');
    check('Restaurar ramo pela interface conserva exclusão anterior da filha', trash.items.some(item => item.id === child.id) && !trash.items.some(item => item.id === root.id));
    const candidate = await create('F12 purge ' + engine + ' ' + Date.now()); await request('/areas/' + candidate.id, 'DELETE');
    await page.goto(web + '/?view=trash'); const candidateCard = card(candidate.nome); await candidateCard.waitFor(); await candidateCard.locator('summary').click();
    let purgeRequests = 0;
    const observe = request => { if (request.url().endsWith('/areas/' + candidate.id + '/purge')) purgeRequests++; }; page.on('request', observe);
    await page.evaluate(() => { window.f12OriginalConfirm = window.confirm; window.confirm = () => false; });
    await candidateCard.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
    check('Cancelar confirmação não envia purge', purgeRequests === 0);
    await page.route(api + '/areas/' + candidate.id + '/purge', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'PURGE_STORAGE_CLEANUP_FAILED', message: 'Limpeza interrompida F12. Tente excluir definitivamente novamente.' }) }), { times: 1 });
    await page.evaluate(() => { window.confirm = () => true; }); await candidateCard.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Limpeza interrompida F12' }).waitFor();
    check('Falha de limpeza preserva o cartão e a possibilidade de repetição', await candidateCard.getByRole('button', { name: 'Excluir definitivamente', exact: true }).isEnabled());
    const confirmed = page.waitForResponse(response => response.url().endsWith('/areas/' + candidate.id + '/purge') && response.status() === 200);
    await candidateCard.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
    const purged = await confirmed;
    check('Purge confirmado usa revisão exibida e retorna ID removido', purged.request().postDataJSON().confirmed === true && (await purged.json()).purgedIds.includes(candidate.id));
    await candidateCard.waitFor({ state: 'detached' }); page.off('request', observe);
    check('Lixeira é relida após a exclusão definitiva', !(await request('/areas/trash?limit=100')).items.some(item => item.id === candidate.id));
    return { passed: true, checks, confirmationChoice: 'window.confirm return values injected; gating also covered by React integration test', failureInjection: '503 UI route only; real partial storage failure and retry covered by PostgreSQL/MinIO integration' };
  } catch (error) { return { passed: false, checks, failure: error.message }; }
  finally { await page.evaluate(() => { if (window.f12OriginalConfirm) window.confirm = window.f12OriginalConfirm; }).catch(() => {}); }
}
