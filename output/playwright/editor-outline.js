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
      heading(2, 'Repetido'), ...gap(), heading(3, 'Repetido'), ...gap(),
      ...Array.from({ length: 24 }, (_, index) => heading(2, `Seção extra ${index + 1}`)),
      paragraph('Fim do documento.'),
    ] },
  };
  const child = { ...fixture, id: '10000000-0000-4000-8000-000000000002', nome: 'Subpágina da fixture', parentId: fixture.id,
    conteudo: { type: 'doc', content: [paragraph('Sem títulos')] } };
  const writes = [];
  const loadFixture = async browserPage => {
    await browserPage.route(`${api}/**`, respond);
    await browserPage.addInitScript(fixtureOrigin => {
      if (location.origin === fixtureOrigin) localStorage.setItem('biblioteca-access-token', 'outline-fixture-token');
    }, origin);
    await browserPage.emulateMedia({ reducedMotion: 'reduce' });
    await browserPage.goto(`${origin}/?page=${fixture.id}`);
  };
  const respond = async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS' };
    const send = json => route.fulfill({ json, headers });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/auth/me') return send({ id: 'outline-fixture-user' });
    if (url.pathname === '/attachments') return send([]);
    if (url.pathname.endsWith('/opened')) return send({ lastOpenedAt: fixture.updatedAt });
    if (method !== 'GET') writes.push(`${method} ${url.pathname}`);
    if (method === 'PATCH' && url.pathname === `/areas/${fixture.id}`) {
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
  };
  await page.setViewportSize({ width: 1440, height: 850 });
  await loadFixture(page);
  const body = page.getByRole('textbox', { name: 'Conteúdo da página' });
  await body.waitFor();
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
  await saved();
  await page.getByTestId('save-status').evaluate(node => {
    node.outlineSaveStates = [];
    new MutationObserver(() => node.outlineSaveStates.push(node.textContent)).observe(node, { childList: true, characterData: true, subtree: true });
  });

  const trigger = page.getByRole('button', { name: 'Índice da página', exact: true });
  const panel = page.getByRole('navigation', { name: 'Índice da página', exact: true });
  const filter = page.getByRole('textbox', { name: 'Filtrar índice' });
  const currentUrl = page.url();
  const editorState = () => body.evaluate(node => {
    const { state } = node.editor;
    const history = state.plugins.find(plugin => plugin.key.startsWith('history$')).getState(state);
    return { doc: state.doc.toJSON(), selection: state.selection.toJSON(), undo: history.done.eventCount, redo: history.undone.eventCount };
  });
  await body.evaluate(node => {
    node.editor.commands.setTextSelection({ from: 2, to: 5 });
    node.editor.view.focus();
  });
  const beforeOutline = await editorState();
  assert(!beforeOutline.doc.content[0].attrs.id && beforeOutline.doc.content.filter(block => block.attrs?.id === 'shared').length === 2, 'A fixture perdeu os IDs legados antes do teste');
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

  const expectJump = async (element, label) => {
    const failure = await viewportError(element, label);
    assert(!failure, failure);
  };
  assert(await body.evaluate(node => node === document.activeElement), 'Mouse transferiu o foco do editor');
  assert(await panel.getByRole('button').count() === 30, 'Índice incluiu título H4, aninhado ou vazio, ou perdeu uma entrada');
  const indent = await panel.locator('li').evaluateAll(rows => rows.slice(0, 3).map(row => parseInt(getComputedStyle(row.firstElementChild).paddingInlineStart, 10)));
  assert(indent[0] < indent[1] && indent[1] < indent[2], 'Os recuos de H1, H2 e H3 não seguem a hierarquia');
  assert(!await body.locator('.toggle-block').evaluate(element => element.open), 'O índice expandiu o bloco recolhido');
  await filter.fill('Fontes');
  assert(await panel.getByRole('button').count() === 1, 'Busca não restringiu a lista');
  await item(names[1]).click();
  await expectJump(target(names[1]), 'Destino após filtrar');
  await filter.fill('Repetido');
  const repeated = item('Repetido');
  for (const index of [1, 0]) {
    await repeated.nth(index).click();
    await expectJump(target('Repetido').nth(index), `Título repetido ${index + 1}`);
  }
  await filter.fill('Nenhum resultado');
  await panel.getByText('Nenhum título encontrado.').waitFor();
  await filter.clear();
  const scrollList = panel.getByRole('list');
  await scrollList.hover();
  const pageScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 600);
  await page.waitForFunction(() => document.querySelector('nav[aria-label="Índice da página"] ul').scrollTop > 0);
  assert(await page.evaluate(() => scrollY) === pageScroll, 'Rolar a lista moveu o documento');
  await page.mouse.move(0, 100);
  assert(await trigger.getAttribute('aria-expanded') === 'true', 'O painel fechou enquanto a busca ainda tinha foco');
  await body.evaluate(node => node.focus({ preventScroll: true }));
  await panel.waitFor({ state: 'hidden' });
  const triggerBox = await trigger.boundingBox();
  await trigger.hover();
  const panelBox = await panel.boundingBox();
  await page.mouse.move(triggerBox.x + triggerBox.width / 2, panelBox.y + panelBox.height - 10, { steps: 8 });
  assert(await panel.isVisible(), 'O painel fechou durante a passagem do mouse a partir do botão');
  await page.mouse.move(0, 100);
  await panel.waitFor({ state: 'hidden' });

  await trigger.focus();
  await page.keyboard.press('Tab');
  assert(!await trigger.evaluate(node => document.getElementById(node.getAttribute('aria-controls')).contains(document.activeElement)), 'Painel recolhido na ordem de Tab');
  await trigger.press('Enter');
  await page.keyboard.press('Tab');
  assert(await filter.evaluate(node => node === document.activeElement), 'Tab avançou para fora da busca');
  await page.keyboard.press('Escape');
  await panel.waitFor({ state: 'hidden' });
  assert(await trigger.evaluate(node => node === document.activeElement) && page.url() === currentUrl, 'Escape perdeu o foco ou saiu da página');
  await trigger.press('Space');
  await item(names[0]).press('Enter');
  await panel.waitFor({ state: 'hidden' });
  await expectJump(target(names[0]), 'Destino após seleção por teclado');
  assert(await trigger.evaluate(node => node === document.activeElement), 'Seleção por teclado não restaurou o foco');
  await saved();
  assert(await page.getByTestId('save-status').evaluate(node => node.outlineSaveStates.every(state => state === 'Salvo')), 'O índice alterou o estado de salvamento');
  assert(writes.length === 0, `O índice disparou gravações: ${writes.join(', ')}`);
  assert(page.url() === currentUrl, `O índice mudou o endereço para ${page.url()}`);
  assert(JSON.stringify(await editorState()) === JSON.stringify(beforeOutline), 'O índice alterou JSON, seleção ou histórico');

  const showItem = async (name, visible = true) => {
    await openByMouse();
    await item(name).waitFor({ state: visible ? 'visible' : 'hidden' });
  };
  await body.evaluate((node, content) => {
    const { editor } = node;
    editor.commands.insertContentAt(editor.state.doc.content.size - editor.state.doc.lastChild.nodeSize, content);
  }, heading(2, 'Título inserido'));
  await showItem('Título inserido');
  await body.evaluate(node => {
    const { editor } = node;
    editor.state.doc.forEach((block, position) => {
      if (block.textContent !== 'Título inserido') return;
      const from = position + 1;
      editor.chain().setTextSelection({ from, to: from + block.content.size }).insertContent('Título renomeado').run();
    });
  });
  await showItem('Título renomeado');
  await showItem('Título inserido', false);
  await body.press('Alt+Shift+ArrowUp');
  await openByMouse();
  const order = await panel.getByRole('button').allTextContents();
  assert(order.at(-2) === 'Título renomeado' && order.at(-1) === 'Seção extra 24', 'Índice não refletiu a reordenação');
  await body.evaluate(node => {
    const { editor } = node;
    editor.state.doc.forEach((block, position) => {
      if (block.textContent === 'Título renomeado') editor.commands.deleteRange({ from: position, to: position + block.nodeSize });
    });
  });
  await showItem('Título renomeado', false);
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await showItem('Título renomeado');
  await page.getByRole('button', { name: 'Refazer', exact: true }).click();
  await showItem('Título renomeado', false);
  await body.evaluate(node => {
    const { editor } = node;
    editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Edição salva' }] });
  });
  await showItem('Edição salva');
  await saved();
  assert(writes.length > 0 && fixture.conteudo.content.some(block => block.type === 'heading' && block.content?.[0].text === 'Edição salva'), 'A edição real não chegou à API de fixture');
  await page.reload();
  await target('Edição salva').waitFor();
  await showItem('Edição salva');

  const tool = label => page.getByRole('button', { name: label, exact: true });
  for (const label of ['Materiais (0)', 'Propriedades', 'Formatar']) {
    await tool(label).click();
    await page.getByRole('dialog', { name: label, exact: true }).waitFor();
    assert(!await trigger.isVisible(), `O índice sobrepôs ${label}`);
    if (label === 'Formatar') {
      await page.getByTestId('full-width-toggle').click();
      assert(await page.getByTestId('editor-root').getAttribute('data-full-width') === 'true', 'A largura ampla não foi aplicada');
    } else await tool('Fechar ferramenta').click();
  }
  await trigger.waitFor();
  await tool('Ações do bloco').click();
  const blockMenu = page.getByRole('menu', { name: 'Ações do bloco' });
  await blockMenu.waitFor();
  await blockMenu.getByRole('menuitem').first().press('Escape');
  await blockMenu.waitFor({ state: 'hidden' });
  assert(page.url() === currentUrl, 'Escape no menu do bloco saiu da página');
  await tool('Modo foco').click();
  assert(!await trigger.isVisible(), 'Índice abriu no modo foco');
  await body.press('Escape');
  await trigger.waitFor();
  const tree = page.getByRole('region', { name: 'Árvore de páginas' });
  await tree.getByRole('button', { name: `Expandir ${fixture.nome}` }).click();
  await tree.getByRole('link', { name: child.nome, exact: true }).click();
  await page.waitForURL(`**/?page=${child.id}`);
  await body.waitFor();
  assert(!await trigger.isVisible(), 'Índice apareceu numa página sem títulos');
  await page.goBack();
  await page.waitForURL(currentUrl);
  await showItem('Edição salva');

  const draft = {
    schemaVersion: 1, id: 'outline-draft', userId: 'outline-fixture-user', pageId: fixture.id,
    creationKey: 'outline-draft', baseUpdatedAt: fixture.updatedAt, sequence: 1, savedAt: new Date().toISOString(),
    snapshot: { ...fixture, nome: 'Página do rascunho do índice', conteudo: { type: 'doc', content: [heading(1, 'Título do rascunho'), ...gap()] } },
  };
  delete draft.snapshot.id;
  delete draft.snapshot.updatedAt;
  await page.evaluate(record => new Promise((resolve, reject) => {
    const open = indexedDB.open('biblioteca-drafts-v1', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put(record);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }), draft);
  await page.reload();
  await page.getByRole('region', { name: 'Rascunhos locais' }).getByRole('listitem').filter({ hasText: draft.snapshot.nome }).getByRole('button', { name: 'Abrir recuperação' }).click();
  await tool('Recuperar para edição').click();
  await showItem('Título do rascunho');
  await showItem('Edição salva', false);
  await saved();

  const mobileContext = await page.context().browser().newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });
  const recovered = fixture.conteudo;
  try {
    const mobile = await mobileContext.newPage();
    // Restore the long fixture for touch, without changing the recovered document in the desktop editor.
    fixture.conteudo = structuredClone(beforeOutline.doc);
    await loadFixture(mobile);
    const mobileTrigger = mobile.getByRole('button', { name: 'Índice da página', exact: true });
    const mobilePanel = mobile.getByRole('navigation', { name: 'Índice da página', exact: true });
    await mobileTrigger.tap();
    const box = await mobilePanel.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= 375 && box.y >= 0, 'Painel não coube na viewport de 375 px');
    await mobilePanel.getByRole('button', { name: names[2], exact: true }).tap();
    await mobilePanel.waitFor({ state: 'hidden' });
    await expectJump(mobile.getByRole('textbox', { name: 'Conteúdo da página' }).getByRole('heading', { name: names[2], exact: true }), 'Destino após toque');
    assert(await mobileTrigger.evaluate(node => node === document.activeElement), 'Toque não restaurou o foco no acionador');
  } finally {
    fixture.conteudo = recovered;
    await mobileContext.close();
  }
  return { destinations: true, filteringAndDuplicates: true, mouseKeyboardTouch: true, noOutlineWrites: true,
    liveEditsAndHistory: true, autosaveAndReload: true, draftRecovery: true, navigationAndTools: true };
}
