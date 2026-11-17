// Run with the Playwright browser_run_code tool against localhost:3001.
// API interception is intentionally test-only; this does not validate a real database.
async (page) => {
  await page.unrouteAll({ behavior: 'wait' });
  await page.addInitScript(() => localStorage.setItem('biblioteca-access-token', 'ux01-isolated-test'));
  const id = '11111111-1111-4111-8111-111111111111';
  let item = { id, nome: 'Página de teste com título extenso para verificar controles', categoria: 'Categoria com nome extenso', section: 'LINGUAGENS', subSection: 'ESTUDANDO', nivelEntendimento: 3, icone: '✦', deletedAt: null, updatedAt: '2026-11-15T12:00:00.000Z', conteudo: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Documento isolado. 日本語 — conteúdo preservado.' }] }] } };
  let fail = 0;
  let count = 0;
  let empty = false;
  let listError = false;
  await page.route('**/areas**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'PATCH') {
      if (fail) return route.fulfill({ status: fail, json: { message: fail === 409 ? 'Conflito: a página foi alterada em outra sessão. Revise antes de salvar.' : 'Não foi possível salvar. Tente novamente.' } });
      item = { ...item, ...request.postDataJSON(), updatedAt: `2026-11-15T12:00:${String(++count).padStart(2, '0')}.000Z` };
    }
    if (url.pathname === '/areas') return route.fulfill({ status: listError ? 500 : 200, json: listError ? { message: 'Falha de teste ao carregar páginas' } : { items: empty ? [] : [item], pagination: { page: 1, limit: 20, total: empty ? 0 : 1, totalPages: 1 } } });
    return route.fulfill({ json: item });
  });
  await page.route('**/attachments**', route => route.fulfill({ json: [] }));
  const results = { viewports: [], behavior: [], contrast: [] };
  const assert = (value, message) => { if (!value) throw new Error(message); results.behavior.push(message); };
  const base = 'http://localhost:3001/';
  const editorUrl = `${base}?page=${id}`;
  const collectionUrl = `${base}?section=LINGUAGENS&status=ESTUDANDO`;
  for (const [name, url] of [['inicio', base], ['status', base + '?section=LINGUAGENS'], ['colecao', collectionUrl], ['editor', editorUrl]]) {
    await page.goto(url);
    if (name === 'editor') await page.getByTestId('topbar').waitFor();
    else await page.getByRole('button', { name: 'Sair', exact: true }).waitFor();
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const measure = await page.evaluate(() => {
        const controls = Array.from(document.querySelectorAll('.ui-properties input, .ui-properties select'));
        const rectangles = controls.map(el => el.getBoundingClientRect());
        const overlap = rectangles.some((a, i) => rectangles.slice(i + 1).some(b => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom));
        const sidebar = document.querySelector('[data-testid="sidebar"]')?.getBoundingClientRect();
        const topbar = document.querySelector('[data-testid="topbar"]')?.getBoundingClientRect();
        const sidebarOverlap = !!sidebar && !!topbar && sidebar.left < topbar.right && topbar.left < sidebar.right && sidebar.top < topbar.bottom && topbar.top < sidebar.bottom;
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overlap, sidebarOverlap, fields: rectangles.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height })) };
      });
      results.viewports.push({ name, ...measure });
      if (measure.scrollWidth > width || measure.overlap || measure.sidebarOverlap) throw new Error(`Layout failure: ${name} ${width}`);
      if ([320, 1440].includes(width)) await page.screenshot({ path: `docs/notion/execucao/evidencias/UX-01-${name}-${width}.png` });
    }
  }
  await page.getByRole('textbox', { name: 'Nome da página' }).fill('Título editado e persistido na API de teste');
  assert((await page.getByTestId('save-status').innerText()).includes('propriedades pendentes'), 'Metadados pendentes indicados');
  fail = 409;
  await page.getByRole('button', { name: 'Salvar e voltar' }).click();
  await page.getByRole('alert').filter({ hasText: 'Conflito' }).waitFor();
  assert(page.url() === editorUrl, 'Conflito preserva a página e a URL');
  assert((await page.getByRole('textbox', { name: 'Nome da página' }).inputValue()).includes('Título editado'), 'Conflito preserva o rascunho');
  fail = 0;
  await page.getByRole('button', { name: 'Salvar e voltar' }).click();
  await page.getByRole('heading', { name: item.nome, exact: true }).waitFor();
  await page.goto(editorUrl);
  await page.getByTestId('topbar').waitFor();
  assert(await page.getByRole('textbox', { name: 'Nome da página' }).inputValue() === item.nome, 'Nova leitura da API de teste recupera o título');
  const body = page.locator('.tiptap');
  await body.click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(' Autosave UX-01.');
  await page.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.textContent === 'Salvo');
  assert(JSON.stringify(item.conteudo).includes('Autosave UX-01.'), 'Autosave envia conteúdo à API de teste');
  const trigger = page.getByRole('button', { name: 'Mais opções da página' });
  await trigger.click();
  await page.keyboard.press('ArrowDown');
  assert(await page.getByRole('menuitem', { name: 'Versões', exact: true }).evaluate(el => el === document.activeElement), 'Setas navegam no menu');
  await page.keyboard.press('Escape');
  assert(await trigger.evaluate(el => el === document.activeElement), 'Escape retorna foco ao acionador');
  assert(page.url() === editorUrl, 'Escape do menu não navega para fora do editor');
  await page.getByRole('textbox', { name: 'Categoria', exact: true }).fill('Categoria pendente');
  await page.route('**/areas/' + id, route => route.request().method() === 'PATCH' ? route.abort('internetdisconnected') : route.fulfill({ json: item }));
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Falha de conexão' }).waitFor();
  assert(page.url() === editorUrl, 'Falha de rede impede saída e mantém pendências');
  await page.unroute('**/areas/' + id);
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByRole('heading', { name: item.nome, exact: true }).waitFor();
  assert(item.categoria === 'Categoria pendente', 'Voltar novamente salva propriedades após recuperação');
  empty = true;
  await page.goto(collectionUrl);
  await page.getByRole('heading', { name: 'Nenhuma página por aqui ainda.' }).waitFor();
  results.behavior.push('Coleção vazia apresenta ação de criação');
  listError = true;
  await page.reload();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).waitFor();
  results.behavior.push('Falha na coleção apresenta tentativa novamente');
  listError = false; empty = false;
  await page.goto(editorUrl);
  await page.getByTestId('topbar').waitFor();
  results.contrast = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const luminance = hex => {
      const channels = hex.trim().replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    return [['--ui-text','--ui-bg'],['--ui-muted','--ui-interactive'],['--ui-accent-text','--ui-accent'],['--ui-control-border','--ui-interactive'],['--ui-danger','--ui-surface']].map(([fg,bg]) => {
      const a=luminance(css.getPropertyValue(fg)), b=luminance(css.getPropertyValue(bg));
      return { fg, bg, ratio: Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)) };
    });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert(await trigger.evaluate(el => getComputedStyle(el).transitionDuration === '0s'), 'Movimento reduzido desativa transições');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return results;
}
