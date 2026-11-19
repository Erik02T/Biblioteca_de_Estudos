// Start the frontend on 127.0.0.1:3128 with NEXT_PUBLIC_API_URL=http://127.0.0.1:3127.
// Run with playwright-cli run-code --filename output/playwright/editor-outline.js.
async (page) => {
  const origin = 'http://127.0.0.1:3128';
  const api = 'http://127.0.0.1:3127';
  if (new URL(page.url()).origin !== origin) throw Error('Use the isolated frontend on port 3128');

  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const text = value => ({ type: 'text', text: value });
  const paragraph = value => ({ type: 'paragraph', content: [text(value)] });
  const heading = (level, value, id) => ({
    type: 'heading', attrs: { level, ...(id ? { id } : {}) }, ...(value && { content: [text(value)] }),
  });
  const gap = () => Array.from({ length: 28 }, () => paragraph('Espaço entre as seções do documento.'));
  const names = ['Começar', 'Fontes e aceite', 'Biblioteca de Estudos', 'Testando o índice!'];
  const fixture = {
    id: '10000000-0000-4000-8000-000000000001', nome: 'Página com índice', parentId: null, targetPageId: null, coverAttachmentId: null,
    section: 'LINGUAGENS', subSection: 'ESTUDANDO', categoria: 'Geral', icone: '✦', nivelEntendimento: 1,
    updatedAt: '2026-11-19T12:00:00.000Z', coverPosition: 50, fullWidth: false,
    conteudo: { type: 'doc', content: [
      heading(1, names[0]), ...gap(), heading(4, 'Fora do índice'),
      { type: 'toggleBlock', attrs: { summary: 'Recolhido', open: false }, content: [heading(2, 'Título aninhado')] },
      heading(2, names[1], 'shared'), ...gap(), heading(2, ''),
      heading(3, names[2], 'shared'), ...gap(), heading(2, names[3], 'last'), ...gap(),
    ] },
  };
  const child = { ...fixture, id: '10000000-0000-4000-8000-000000000002', nome: 'Subpágina da fixture', parentId: fixture.id,
    conteudo: { type: 'doc', content: [paragraph('Sem títulos')] } };
  let writes = 0;
  await page.route(`${api}/**`, async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS' };
    const send = json => route.fulfill({ json, headers });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/auth/me') return send({ id: 'outline-fixture-user' });
    if (url.pathname === '/attachments') return send([]);
    if (url.pathname.endsWith('/opened')) return send({ lastOpenedAt: fixture.updatedAt });
    if (method === 'PATCH' && url.pathname === `/areas/${fixture.id}`) {
      writes += 1;
      Object.assign(fixture, route.request().postDataJSON(), { updatedAt: new Date().toISOString() });
      return send(fixture);
    }
    if (url.pathname === `/areas/${fixture.id}`) return send(fixture);
    if (url.pathname === `/areas/${child.id}`) return send(child);
    if (url.pathname === '/areas' || url.pathname === '/areas/navigation') {
      const items = [fixture, child].map(({ conteudo, ...item }) => item);
      return send({ items, pagination: { page: 1, totalPages: 1, total: items.length } });
    }
    return route.fulfill({ status: 404, json: {}, headers });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 850 });
  await page.evaluate(() => localStorage.setItem('biblioteca-access-token', 'outline-fixture-token'));
  await page.goto(`${origin}/?page=${fixture.id}`);
  const body = page.getByRole('textbox', { name: 'Conteúdo da página' });
  await body.waitFor();
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
  await saved();

  const trigger = page.getByRole('button', { name: 'Índice da página', exact: true });
  const summary = page.locator('summary').filter({ hasText: /^Índice da página$/ });
  const legacy = await summary.count() > 0;
  if (legacy) await summary.click();
  const openByMouse = async () => { if (!legacy) await trigger.hover(); };
  const item = name => page.getByRole('button', { name: legacy ? `# ${name}` : name, exact: true });
  const target = name => body.getByRole('heading', { name, exact: true });
  const viewportError = async (element, label) => {
    const { top, atEnd, height } = await element.evaluate(node => {
      const scroller = document.scrollingElement;
      return { top: node.getBoundingClientRect().top, height: innerHeight,
        atEnd: scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 2 };
    });
    if (top < -2 || (top > 128 && (!atEnd || top >= height))) return `${label}: top=${Math.round(top)}px, scroll end=${atEnd}`;
  };

  const destinationErrors = [];
  for (const name of [names[3], names[0], names[2], names[1], names[3]]) {
    await openByMouse();
    await item(name).click();
    // The old command schedules focus and scrolling on the next animation frame.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const failure = await viewportError(target(name), `Salto para ${name}`);
    if (failure) destinationErrors.push(failure);
  }
  assert(destinationErrors.length === 0, destinationErrors.join('\n'));
  return { destinations: true, writes };
}
