// Uses the actual local API/PostgreSQL started by ux05-server.cjs. No remote mutation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eriks/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');
const base = 'http://localhost:3033', output = __dirname;
const artifact = process.env.UX_ARTIFACT_PREFIX || 'UX-05';
(async () => {
  let token;
  const api = async (route, method = 'GET', body) => {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.ok(response.ok, `${method} ${route}: ${response.status}`);
    return response.json();
  };
  token = (await api('/auth/register', 'POST', { email: `ux05-${randomUUID()}@example.com`, password: randomUUID() + randomUUID() })).accessToken;
  const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  const create = (nome, conteudo, targetPageId) => api('/areas', 'POST', { nome, categoria: 'Teste isolado UX-05-blocos', section: 'LINGUAGENS', subSection: 'ESTUDANDO', nivelEntendimento: 3, conteudo, targetPageId });
  const target = await create('Destino por ID UX-05-blocos', { type: 'doc', content: [paragraph('Referência preservada')] });
  const item = await create('Documento misto UX-05-blocos — título extenso para testar operações', { type: 'doc', content: [
    { type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: 'Título legado H6' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '日本語 — texto com link', marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://example.com/estudo' } }] }] },
    { type: 'codeBlock', attrs: { language: 'javascript' }, content: [{ type: 'text', text: 'const estudo = "日本語";\nconsole.log(estudo);' }] },
    { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [paragraph('Tarefa principal'), { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [paragraph('Tarefa filha 日本語')] }] }] }] },
    { type: 'toggleBlock', attrs: { open: true, summary: 'Seção original' }, content: [paragraph('Texto do alternante 日本語')] },
    { type: 'callout', attrs: { variant: 'tip' }, content: [paragraph('Destaque preservado')] },
    { type: 'paragraph' },
  ] }, target.id);
  const material = await api('/attachments', 'POST', { areaId: item.id, tipo: 'LINK', nome: 'Material preservado UX-05-blocos', url: 'https://example.com/material' });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const results = { checks: [], viewports: [], errors: [], ime: 'NÃO EXECUTADO — IME físico. Eventos sintéticos não comprovam composição real.' };
  const check = (value, name) => { assert.ok(value, name); results.checks.push(name); console.log('PASS:', name); };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => results.errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem('biblioteca-access-token', value), token);
    const proxy = async route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://localhost:3001') return route.continue();
      if (!['/areas', '/attachments', '/auth', '/templates'].some(prefix => url.pathname.startsWith(prefix))) return route.abort();
      const response = await route.fetch({ url: base + url.pathname + url.search });
      await route.fulfill({ response });
    };
    await page.route('**/*', proxy);
    const button = name => page.getByRole('button', { name, exact: true });
    const menuitem = name => page.getByRole('menuitem', { name, exact: true });
    const doc = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true });
    const saved = async () => {
      await page.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.textContent === 'Salvo');
      return api(`/areas/${item.id}`);
    };
    await page.goto(`http://localhost:3001/?page=${item.id}`); await doc.waitFor();
    await doc.evaluate(el => { el.dataset.ux05Instance = 'retained'; });
    const originalHTML = await doc.innerHTML();
    await doc.locator(':scope > p').first().click();
    await button('Ações do bloco').click(); await menuitem('Duplicar bloco').click();
    check(await doc.locator(':scope > p').filter({ hasText: '日本語 — texto com link' }).count() === 2, 'Duplicação conserva japonês e links');
    await button('Ações do bloco').click(); await menuitem('Mover bloco para baixo').click();
    await button('Desfazer').click(); await button('Desfazer').click();
    check(await doc.innerHTML() === originalHTML, 'Mover e duplicar têm passos independentes de undo e conservam HTML');
    await button('Refazer').click(); await button('Desfazer').click();
    await doc.locator(':scope > p').first().click();
    await page.keyboard.press('Home'); await page.keyboard.down('Shift'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.up('Shift');
    const selected = await page.evaluate(() => getSelection().toString());
    await button('Transformar bloco').click();
    check(await menuitem('Código').isDisabled(), 'Conversão que apagaria marcas/link fica indisponível');
    await menuitem('Título 2').click();
    check(await page.evaluate(() => getSelection().toString()) === selected, 'Transformação preserva seleção de texto');
    check(await doc.locator('h2 a strong').count() + await doc.locator('h2 strong a').count() > 0, 'Transformação preserva link e negrito');
    await button('Desfazer').click();
    await doc.locator('pre').click(); await page.keyboard.press('End'); await page.keyboard.type('/');
    check(await page.getByRole('menu').count() === 0, 'Barra dentro de código permanece texto');
    await page.keyboard.press('Backspace');
    await doc.locator(':scope > p').last().click(); await page.keyboard.type('/codigo');
    await menuitem('Código').waitFor();
    await page.keyboard.press('Enter'); await page.keyboard.type('const novo = "日本語";');
    check(await doc.locator('pre').count() === 2, 'Comando / filtra e insere bloco de código real');
    await saved();
    await doc.locator(':scope > p').last().click(); await page.keyboard.type('/semresultado');
    check(await page.getByText('Nenhum comando encontrado. Escape mantém o texto digitado.').isVisible(), 'Busca sem resultados mantém texto');
    await button('Modo foco').click();
    // Clicking another control dismisses the active menu; type once to reopen it.
    await doc.locator(':scope > p').last().click(); await page.keyboard.type('x');
    await page.keyboard.press('Escape');
    check(await page.getByTestId('editor-root').getAttribute('data-focus-mode') === 'true', 'Escape fecha menu antes de sair do foco');
    check(new URL(page.url()).searchParams.get('page') === item.id, 'Escape de menu não sai da página');
    await page.keyboard.press('Escape'); await button('Modo foco').waitFor();
    await page.keyboard.press('Control+End'); await page.keyboard.press('Control+Shift+ArrowUp');
    // Keep the literal test text; it is checked after reload too.
    await page.keyboard.press('ArrowRight');
    await saved();
    // NodeView state must follow transactions, not its stale creation-time node.
    const summary = doc.locator('details summary');
    page.once('dialog', dialog => dialog.accept('Primeiro título')); await button('Renomear alternante').click();
    await page.waitForFunction(() => document.querySelector('.tiptap details')?.dataset.summary === 'Primeiro título');
    page.once('dialog', async dialog => { check(dialog.defaultValue() === 'Primeiro título', 'Alternante usa título atualizado'); await dialog.accept('Título por teclado'); });
    await summary.focus(); await page.keyboard.press('F2');
    await page.waitForFunction(() => document.querySelector('.tiptap details')?.dataset.summary === 'Título por teclado');
    await button('Desfazer').click(); check(await summary.locator(':scope > span').innerText() === 'Primeiro título', 'Renomear alternante por teclado permite desfazer');
    await summary.locator(':scope > span').click(); await saved();
    const closed = await api(`/areas/${item.id}`);
    check(closed.conteudo.content.find(node => node.type === 'toggleBlock').attrs.open === false, 'Abrir/fechar alternante persiste estado real');
    await button('Desfazer').click(); await saved();
    check((await api(`/areas/${item.id}`)).conteudo.content.find(node => node.type === 'toggleBlock').attrs.open === true, 'Undo do alternante não é revertido por evento nativo');

    const stateBeforeIme = (await api(`/areas/${item.id}`)).conteudo;
    await doc.dispatchEvent('compositionstart', { data: '' });
    for (const key of ['/', 'Enter', 'ArrowDown', 'Escape']) {
      const consumed = await doc.evaluate((el, key) => !el.dispatchEvent(new KeyboardEvent('keydown', { key, isComposing: true, keyCode: 229, bubbles: true, cancelable: true })), key);
      check(!consumed, `Composição sintética não captura ${key}`);
    }
    await doc.dispatchEvent('compositionend', { data: '日本語' });
    check(await page.getByRole('menu').count() === 0, 'Composição sintética não abre menu');
    check(JSON.stringify((await api(`/areas/${item.id}`)).conteudo) === JSON.stringify(stateBeforeIme), 'Eventos de composição não alteram JSON');

    await button('Materiais (1)').click(); await page.getByRole('link', { name: material.nome }).waitFor();
    await button('Fechar ferramenta').click();
    check(await doc.getAttribute('data-ux05-instance') === 'retained', 'Menus e materiais preservam a instância do editor');
    const persisted = await saved();
    check(persisted.targetPageId === target.id, 'Referência de página por ID preservada');
    check((await api(`/attachments?areaId=${item.id}`)).some(attachment => attachment.id === material.id), 'Operações de bloco preservam material por ID');
    const originalCode = persisted.conteudo.content.find(node => node.type === 'codeBlock');
    check(originalCode.attrs.language === 'javascript' && originalCode.content[0].text.includes('console.log'), 'Linguagem e texto do código legado preservados');
    check(persisted.conteudo.content.some(node => node.type === 'heading' && node.attrs.level === 6), 'H6 legado preservado em nova leitura HTTP');
    const task = persisted.conteudo.content.find(node => node.type === 'taskList');
    check(task.content[0].attrs.checked && task.content[0].content[1].content[0].attrs.checked === false, 'Tarefas e aninhamento preservados em nova leitura HTTP');
    await page.reload(); await doc.waitFor();
    check(await doc.locator('pre').count() === 2 && (await doc.innerText()).includes('const novo = "日本語";'), 'Recarga recupera blocos editados do PostgreSQL');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await button('+ Inserir bloco').click();
      const bounds = await page.getByRole('menu').boundingBox();
      const sizes = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      check(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= 900 && sizes.scrollWidth <= width, `Menu e documento sem overflow em ${width}px`);
      const targets = await page.getByRole('menuitem').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
      check(targets.every(height => height >= 44), `Alvos de menu >=44px em ${width}px`);
      results.viewports.push({ ...sizes, menu: bounds });
      if (width === 320 || width === 1440) await page.screenshot({ path: path.join(output, `${artifact}-blocos-depois-${width}.png`) });
      await page.keyboard.press('End'); await page.keyboard.press('Home'); await page.keyboard.press('Escape');
      check(await button('+ Inserir bloco').evaluate(el => el === document.activeElement), `Escape retorna foco ao acionador em ${width}px`);
      if (width === 320 || width === 1440) await page.screenshot({ path: path.join(output, `${artifact}-blocos-documento-${width}.png`) });
    }
    // Touch uses the same always-visible control, with no hover prerequisite.
    const touch = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    await touch.addInitScript(value => localStorage.setItem('biblioteca-access-token', value), token);
    const touchPage = await touch.newPage();
    await touchPage.route('**/*', proxy);
    await touchPage.goto(`http://localhost:3001/?page=${item.id}`);
    await touchPage.getByRole('button', { name: 'Ações do bloco', exact: true }).tap();
    check(await touchPage.getByRole('menuitem', { name: 'Duplicar bloco', exact: true }).isVisible(), 'Acionador de bloco funciona por toque em contexto com hasTouch');
    await touch.close();
    await page.setViewportSize({ width: 375, height: 812 });
    await button('Ações do bloco').click(); await page.keyboard.press('Escape');
    const unsupported = { type: 'doc', content: [paragraph('Original 日本語'), { type: 'image', attrs: { attachmentId: 'stable-image-id' } }, { type: 'attachment', attrs: { attachmentId: 'stable-file-id' } }, { type: 'pageReference', attrs: { pageId: target.id } }] };
    const guarded = await create('Documento com mídia original', unsupported, target.id);
    await page.goto(`http://localhost:3001/?page=${guarded.id}`);
    await page.getByRole('region', { name: 'Conteúdo original preservado' }).waitFor();
    check(await page.locator('.tiptap[contenteditable="true"]').count() === 0, 'Documento com mídia/referências ainda não suportadas bloqueia edição destrutiva');
    await page.getByRole('textbox', { name: 'Nome da página' }).fill('Metadado alterado sem perder mídia');
    await button('Salvar e voltar').click(); await page.getByRole('heading', { name: 'Metadado alterado sem perder mídia' }).waitFor();
    assert.deepEqual((await api(`/areas/${guarded.id}`)).conteudo, unsupported);
    check(true, 'Salvar metadados preserva JSON original com IDs de mídia/referência');
    await page.goto(`http://localhost:3001/?page=${item.id}`); await doc.waitFor();
    const concurrent = await api(`/areas/${item.id}`);
    await api(`/areas/${item.id}`, 'PATCH', { nome: 'Nome concorrente de teste', updatedAt: concurrent.updatedAt });
    const failedSave = page.waitForResponse(response => response.url().includes(`/areas/${item.id}`) && response.request().method() === 'PATCH');
    await doc.locator(':scope > p').last().click(); await page.keyboard.press('End'); await page.keyboard.type(' pendência local UX04');
    assert.equal((await failedSave).status(), 409);
    await page.getByTestId('editor-root').getByRole('alert').waitFor();
    check((await doc.innerText()).includes('pendência local UX04'), 'Conflito real 409 mantém a alteração local no editor');
    check(!JSON.stringify((await api(`/areas/${item.id}`)).conteudo).includes('pendência local UX04'), 'Conflito real não sobrescreve a versão concorrente');
    check(await button('Desfazer').isEnabled(), 'Undo continua disponível após conflito');
    check(results.errors.length === 0, 'Sem exceções JavaScript no navegador');
    fs.writeFileSync(path.join(output, `${artifact}-blocos-browser-resultados.json`), JSON.stringify({ state: 'VERIFICADO COM LIMITES', database: 'biblioteca_test_ux05_20261115', ...results }, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
