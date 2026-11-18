// Synthetic composition coverage only; does not claim physical Japanese IME validation.
// All API traffic is intercepted. No request is sent to an external service.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eriks/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const phase = process.argv[2] || 'antes';
const width = Number(process.env.UX_TEST_WIDTH || 1440);
const front = 'http://localhost:3001';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = { phase, width, checks: [], composition: [], requests: [], errors: [], integration: 'HTTP interceptado; não comprova persistência real', ime: 'NÃO EXECUTADO: IME real' };
  const check = (value, name) => { assert.ok(value, name); results.checks.push(name); };
  const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
  let item = { id: '11111111-1111-4111-8111-111111111111', nome: 'Teste UX-05 composição 日本語', categoria: 'Categoria isolada', section: 'LINGUAGENS', subSection: 'ESTUDANDO', nivelEntendimento: 3, updatedAt: '2026-11-16T12:00:00.000Z', conteudo: { type: 'doc', content: [paragraph('Texto 日本語 preservado'), { type: 'heading', attrs: { level: 6 }, content: [{ type: 'text', text: 'H6 legado' }] }, { type: 'toggleBlock', attrs: { open: true, summary: 'Original' }, content: [paragraph('Conteúdo do alternante')] }, { type: 'paragraph' }] } };
  let revision = 0;
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', error => results.errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('biblioteca-access-token', 'fixture-ux05-correcao'));
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === front) return route.continue();
      results.requests.push({ method: request.method(), path: url.pathname });
      if (url.pathname === `/areas/${item.id}`) {
        if (request.method() === 'PATCH') {
          item = { ...item, ...request.postDataJSON(), updatedAt: new Date(Date.UTC(2026, 10, 16, 12, 0, 0, ++revision)).toISOString() };
        }
        return route.fulfill({ json: item });
      }
      if (url.pathname === '/areas') return route.fulfill({ json: { items: [item], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } } });
      return route.fulfill({ json: [] });
    });
    const button = name => page.getByRole('button', { name, exact: true });
    const doc = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true });
    const open = async () => { await page.goto(`${front}/?page=${item.id}`); await doc.waitFor(); };
    const event = async (target, key, attrs) => target.evaluate((el, { key, attrs }) => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...attrs });
      el.dispatchEvent(event);
      return { consumed: event.defaultPrevented, isComposing: event.isComposing, keyCode: event.keyCode };
    }, { key, attrs });
    const observe = (name, value, details) => {
      results.composition.push({ name, passed: Boolean(value), ...details });
    };
    // Record each failure before changing product code. Final phase asserts all observations.
    for (const attrs of [{ isComposing: false, keyCode: 229 }, { isComposing: true, keyCode: 0 }]) {
      const variant = attrs.keyCode === 229 ? '229 sem isComposing' : 'isComposing';
      await open(); await button('Modo foco').click(); await doc.focus();
      const focusEvent = await event(doc, 'Escape', attrs);
      await page.waitForTimeout(50);
      observe(`Modo foco preservado: ${variant}`, await page.getByTestId('editor-root').getAttribute('data-focus-mode') === 'true' && !focusEvent.consumed, focusEvent);
      await open(); await button('Propriedades').click();
      const field = page.getByRole('textbox', { name: 'Categoria', exact: true });
      await field.fill('Propriedade pendente 日本語');
      const toolEvent = await event(field, 'Escape', attrs);
      await page.waitForTimeout(50);
      observe(`Ferramenta e campo preservados: ${variant}`, await page.getByRole('dialog', { name: 'Propriedades' }).isVisible() && await field.isVisible() && !toolEvent.consumed, toolEvent);
      await page.reload(); await doc.waitFor();
      await button('Mais opções da página').click();
      const first = page.getByRole('menuitem', { name: 'Exportar', exact: true });
      await first.focus();
      const arrowEvent = await event(first, 'ArrowDown', attrs);
      observe(`Seta não move foco do menu: ${variant}`, await first.evaluate(el => el === document.activeElement) && !arrowEvent.consumed, arrowEvent);
      const menuEvent = await event(first, 'Escape', attrs);
      await page.waitForTimeout(50);
      observe(`Menu da página preservado: ${variant}`, await page.getByRole('menu').isVisible() && !menuEvent.consumed, menuEvent);
      await page.screenshot({ path: path.join(__dirname, `UX-05-correcao-${phase}-${attrs.keyCode === 229 ? '229' : 'composing'}.png`) });
    }
    // Ordinary Escape still closes the nearest layer and returns keyboard focus.
    await open(); await button('Modo foco').click(); await doc.focus(); await page.keyboard.press('Escape');
    check(await page.getByTestId('editor-root').getAttribute('data-focus-mode') === 'false', 'Escape normal sai do foco');
    check(new URL(page.url()).searchParams.get('page') === item.id, 'Escape de foco mantém URL da página');
    await button('Propriedades').click(); await page.getByRole('textbox', { name: 'Categoria', exact: true }).focus(); await page.keyboard.press('Escape');
    check(await button('Propriedades').evaluate(el => el === document.activeElement), 'Escape normal fecha ferramenta e retorna foco');
    await button('Mais opções da página').click();
    await page.keyboard.press('End');
    check(await page.getByRole('menuitem', { name: 'Atalhos de teclado', exact: true }).evaluate(el => el === document.activeElement), 'End normal navega no menu');
    await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown');
    check(await page.getByRole('menuitem', { name: 'Versões', exact: true }).evaluate(el => el === document.activeElement), 'Home/seta normais navegam no menu');
    await page.keyboard.press('Escape');
    check(await button('Mais opções da página').evaluate(el => el === document.activeElement), 'Escape normal fecha menu da página e retorna foco');
    // Recheck UX04-001/002/003 and UX04-005 with the actual editor instance.
    await doc.evaluate(el => { el.dataset.ux05Correcao = 'retained'; });
    const summary = doc.locator('details summary');
    page.once('dialog', dialog => dialog.accept('Primeiro título')); await button('Renomear alternante').click();
    await page.waitForFunction(() => document.querySelector('.tiptap details')?.dataset.summary === 'Primeiro título');
    page.once('dialog', async dialog => { check(dialog.defaultValue() === 'Primeiro título', 'UX04-001 usa título atualizado'); await dialog.accept('Segundo título'); });
    await summary.focus(); await page.keyboard.press('F2');
    await page.waitForFunction(() => document.querySelector('.tiptap details')?.dataset.summary === 'Segundo título');
    await button('Desfazer').click();
    check(await summary.locator(':scope > span').innerText() === 'Primeiro título', 'UX04-002 renomeações têm undo separado');
    await summary.locator(':scope > span').click();
    await page.waitForFunction(() => !document.querySelector('.tiptap details')?.open);
    await button('Desfazer').click();
    await page.waitForFunction(() => document.querySelector('.tiptap details')?.open);
    check(await summary.locator(':scope > span').innerText() === 'Primeiro título', 'UX04-003 undo de toggle preserva título');
    await doc.locator(':scope > p').last().click(); await page.keyboard.type('/codigo');
    await page.getByRole('menuitem', { name: 'Código', exact: true }).waitFor(); await page.keyboard.press('Enter');
    await page.keyboard.type('const teste = 1;');
    check(await doc.locator('pre').count() === 1, 'Slash continua inserindo código');
    await button('Modo foco').click(); await button('+ Inserir bloco').click(); await page.keyboard.press('Escape');
    check(await page.getByTestId('editor-root').getAttribute('data-focus-mode') === 'true', 'UX04-005 Escape fecha menu antes do foco');
    await button('Sair do foco').click();
    check(await doc.getAttribute('data-ux05-correcao') === 'retained', 'Mesma instância DOM nas ferramentas e comandos');
    await page.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.textContent === 'Salvo');
    await page.reload(); await doc.waitFor();
    check((await doc.innerText()).includes('const teste = 1;') && await doc.locator('h6').count() === 1, 'Recarga lê fixture HTTP atualizada mantendo código e H6');
    // Missing media/reference support remains a failing acceptance criterion, not a fix.
    const unsupported = { type: 'doc', content: [paragraph('Original 日本語'), { type: 'image', attrs: { attachmentId: 'image-id' } }, { type: 'attachment', attrs: { attachmentId: 'file-id' } }, { type: 'pageReference', attrs: { targetPageId: '22222222-2222-4222-8222-222222222222' } }] };
    item = { ...item, conteudo: unsupported };
    await page.reload(); await page.getByRole('region', { name: 'Conteúdo original preservado' }).waitFor();
    check(await page.locator('.tiptap[contenteditable="true"]').count() === 0, 'UX04-004 proteção de JSON incompatível continua ativa');
    await page.getByRole('textbox', { name: 'Nome da página' }).fill('Metadado sem perder original');
    await button('Salvar e voltar').click();
    await page.getByRole('heading', { name: 'Metadado sem perder original', exact: true }).waitFor();
    assert.deepEqual(item.conteudo, unsupported);
    check(true, 'Payload de metadados preserva JSON integral e IDs');
    results.media = 'FALHOU: sem tipos image/attachment/pageReference e sem inserção no corpo. Proteção não equivale a suporte.';
    check(results.errors.length === 0, 'Sem pageerror');
    if (phase !== 'antes') check(results.composition.every(result => result.passed), 'Todos os cenários sintéticos de composição passaram');
  } finally {
    fs.writeFileSync(path.join(__dirname, `UX-05-correcao-ime-${phase}.json`), JSON.stringify(results, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ phase, checks: results.checks.length, composition: results.composition }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
