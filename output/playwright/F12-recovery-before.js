async (page) => {
  const { api, web, fixture, account, engine } = __F12_SETTINGS__;
  const id = fixture.ids[12], marker = 'F12 recuperação após processo encerrado ' + engine + ' ' + Date.now();
  try {
    await page.goto(web + '/?page=' + id);
    const title = page.getByRole('textbox', { name: 'Nome da página', exact: true }); await title.waitFor();
    await page.evaluate(marker => localStorage.setItem('f12-recovery-marker', marker), marker);
    await page.route(api + '/areas/' + id, route => route.request().method() === 'PATCH' ? route.abort('internetdisconnected') : route.continue());
    await title.fill(marker);
    const expectedError = page.getByTestId('save-status').filter({ hasText: /Atenção/ });
    await expectedError.waitFor();
    const durable = await page.evaluate(async ({ account, id, marker }) => {
      const database = await new Promise((resolve, reject) => { const request = indexedDB.open('biblioteca-drafts-v1', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const records = await new Promise((resolve, reject) => { const tx = database.transaction('drafts', 'readonly'); const request = tx.objectStore('drafts').getAll(); let rows; request.onsuccess = () => { rows = request.result; }; tx.oncomplete = () => resolve(rows); tx.onerror = () => reject(tx.error); }); database.close();
      return records.some(row => row.userId === account.id && row.pageId === id && row.snapshot.nome === marker);
    }, { account, id, marker });
    if (!durable) throw Error('Draft was not committed to IndexedDB');
    return { passed: true, stage: 'before-forced-process-exit', durableIndexedDB: true, engine, pageId: id, marker, networkFailure: 'PATCH aborted; reads remain online' };
  } catch (error) { return { passed: false, failure: error.message }; }
}
