async (page) => {
  const { api, web, account, volume, engine } = __F12_SETTINGS__;
  const metrics = {}, observations = [], errors = [], navigationResponses = [], searchResponses = [];
  let context;
  const stats = samples => { const sorted = [...samples].sort((a,b) => a-b); return { samplesMs: samples.map(value => Math.round(value * 10) / 10), medianMs: Math.round(((sorted[4] + sorted[5]) / 2) * 10) / 10, maximumMs: Math.round(sorted.at(-1) * 10) / 10 }; };
  const measure = async action => { const start = Date.now(); await action(); return Date.now() - start; };
  try {
    const login = await page.request.post(api + '/auth/login', { data: { email: account.email, password: account.password } });
    if (!login.ok()) throw Error('Volume login: ' + login.status());
    const tokens = await login.json();
    context = await page.context().browser().newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(({ web, tokens }) => { if (location.origin === web) { localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken); } }, { web, tokens });
    const measured = await context.newPage(); measured.setDefaultTimeout(15000);
    measured.on('pageerror', error => errors.push(error.message));
    measured.on('response', async response => {
      if (new URL(response.url()).pathname === '/areas/search') searchResponses.push({ q: new URL(response.url()).searchParams.get('q'), status: response.status() });
      if (response.url().includes('/areas/navigation?')) {
        const value = await response.json().catch(() => null);
        navigationResponses.push({ status: response.status(), bytes: (await response.body().catch(() => Buffer.from(''))).length, items: value?.items?.length, containsBodies: value?.items?.some(item => 'conteudo' in item) });
      }
      if (response.url().startsWith(api) && response.status() === 429) errors.push('API rate limit reached; this measurement must be repeated in a separate batch');
    });
    metrics.coldCollectionMs = await measure(async () => {
      const navigationComplete = measured.waitForResponse(response => response.url().includes('/areas/navigation?page=10&') && response.status() === 200);
      await measured.goto(web + '/?view=all&scope=ALL&layout=TABLE&order=nome&direction=asc');
      await measured.getByText(/^(?:1\.000|1000) páginas$/).waitFor();
      await measured.locator('tbody tr').first().waitFor();
      await navigationComplete;
    });
    const collectionSamples = [];
    for (let i = 0; i < 10; i++) {
      await measured.getByRole('combobox', { name: 'Visualização:', exact: true }).selectOption('LIST');
      collectionSamples.push(await measure(async () => { await measured.getByRole('combobox', { name: 'Visualização:', exact: true }).selectOption('TABLE'); await measured.locator('tbody tr').first().waitFor(); }));
    }
    metrics.warmCollectionLayout = stats(collectionSamples);
    await measured.getByRole('link', { name: 'Projetos', exact: true }).click();
    await measured.locator(`a[href="/?page=${volume.ids[990]}"]`).first().waitFor();
    const short = volume.ids[510], large = volume.ids[990];
    const body = measured.getByRole('textbox', { name: 'Conteúdo da página', exact: true });
    const open = async id => {
      if (!await measured.locator(`a[href="/?page=${id}"]`).first().isVisible()) await measured.getByRole('button', { name: 'Navegação', exact: true }).first().click();
      await measured.locator(`a[href="/?page=${id}"]`).first().click();
      await body.waitFor(); await measured.waitForURL('**/?page=' + id);
    };
    metrics.firstLargeDocumentMs = await measure(() => open(large));
    const documentSamples = [];
    for (let i = 0; i < 10; i++) {
      await open(short);
      documentSamples.push(await measure(() => open(large)));
    }
    metrics.warmThousandBlockDocument = stats(documentSamples);
    await body.click(); await body.press('Control+Home');
    await measured.evaluate(() => {
      window.f12InputTimes = [];
      const element = document.querySelector('[aria-label="Conteúdo da página"]');
      element.addEventListener('beforeinput', () => { const start = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => window.f12InputTimes.push(performance.now() - start))); });
    });
    for (let i = 0; i < 10; i++) { await measured.keyboard.type('a'); await measured.waitForFunction(count => window.f12InputTimes.length >= count, i + 1); }
    const inputTimes = await measured.evaluate(() => window.f12InputTimes);
    if (inputTimes.length !== 10) throw Error('Expected ten measured input events');
    metrics.inputToSecondAnimationFrame = stats(inputTimes);
    const savingStart = Date.now(); await measured.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor(); metrics.lastKeystrokeToConfirmedSaveMs = Date.now() - savingStart;
    if (!await measured.getByRole('button', { name: 'Buscar páginas', exact: true }).isVisible()) await measured.getByRole('button', { name: 'Navegação', exact: true }).first().click();
    await measured.getByRole('button', { name: 'Buscar páginas', exact: true }).click();
    const search = measured.getByRole('textbox', { name: 'Buscar em toda a biblioteca', exact: true });
    const searchSamples = [];
    for (let i = 0; i < 10; i++) {
      const index = i % 2 ? 999 : 998, query = 'Sentinela F12 ' + index;
      searchSamples.push(await measure(async () => {
        const response = measured.waitForResponse(response => new URL(response.url()).pathname === '/areas/search' && new URL(response.url()).searchParams.get('q') === query && [200, 304].includes(response.status()));
        await search.fill(query); await response;
        await measured.locator('.library-search li button').filter({ hasText: 'F12 Estudo 0' + index }).waitFor();
      }));
    }
    metrics.bodySearchBeyondFirstPage = stats(searchSamples);
    if (navigationResponses.some(item => item.containsBodies)) throw Error('Navigation transported complete documents');
    if (navigationResponses.some(item => item.status !== 200)) throw Error('Navigation request failed');
    if (errors.length) throw Error(errors.join('; '));
    observations.push('First load uses a fresh browser context/cache. Warm collection measures layout changes with existing data; document samples use in-app navigation. Input measures beforeinput to the second animation frame, including layout, not an INP score.');
    return { passed: true, engine, browserVersion: context.browser().version(), pages: 1000, measuredDocumentBlocks: 1000, viewport: '1280x720', metrics, navigationResponses, searchResponses, errors, observations, userPerformanceAcceptance: 'pending-human', sla: null };
  } catch (error) { return { passed: false, engine, metrics, navigationResponses, searchResponses, errors, failure: error.message }; }
  finally { await context?.close(); }
}
