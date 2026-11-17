async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3048') throw Error('Use isolated F10 frontend');
  page.setDefaultTimeout(7000);
  const results = { checks: [], errors: [], ime: 'Pendente: IME japonês físico; automação não comprova este aceite.' };
  page.on('pageerror', error => results.errors.push(error.message));
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('f10-fixture')));
  const assert = (condition, name) => { if (!condition) throw Error(name); results.checks.push(name); };
  const body = page.getByRole('textbox', { name: 'Conteúdo da página' });
  const commands = page.getByRole('group', { name: 'Comandos do documento', exact: true });
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor({ timeout: 12000 });
  const remote = async (id = ids.main) => page.evaluate(async id => {
    const response = await fetch('http://localhost:3047/areas/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!response.ok) throw Error('Remote read: ' + response.status); return response.json();
  }, id);
  const slash = async (query, command) => {
    // Deterministic fixture caret, via Tiptap's public focus API. Menu typing,
    // selection, dialogs and uploads below are actual browser interactions.
    await body.evaluate(element => element.editor.commands.focus('end'));
    await page.keyboard.press('Enter'); await page.keyboard.type('/' + query);
    await page.getByRole('menuitem', { name: command, exact: true }).click();
  };
  const pick = () => page.getByRole('dialog', { name: 'Inserir referência de página' });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3048' });
  await body.waitFor();
  await page.getByRole('combobox', { name: 'Linguagem do código' }).selectOption('python'); await saved();
  await page.getByRole('button', { name: 'Copiar código', exact: true }).click();
  await page.getByText('Código copiado.', { exact: true }).waitFor();
  // Windows exposes clipboard line endings as CRLF; writeText receives the exact LF source (unit test).
  assert((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n') === '  const valor = "日本語";\n\tconsole.log(valor);', 'Código: cópia preserva indentação/japonês e quebras nativas do Windows');
  assert((await remote()).conteudo.content.find(node => node.type === 'codeBlock').attrs.language === 'python', 'Código: linguagem persistida');

  await body.locator('li p').filter({ hasText: 'Tarefa B' }).click();
  await commands.getByRole('button', { name: 'Ações do bloco', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Mover bloco para cima', exact: true }).click();
  await saved();
  assert((await remote()).conteudo.content.find(node => node.type === 'taskList').content[0].content[0].content[0].text === 'Tarefa B', 'Menu: move item interno da lista');
  await body.press('Alt+Shift+ArrowDown'); await saved();
  assert((await remote()).conteudo.content.find(node => node.type === 'taskList').content[0].attrs.checked === true, 'Teclado: movimento equivalente preserva tarefa marcada');
  await commands.getByRole('button', { name: 'Ações do bloco', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Duplicar bloco', exact: true }).click();
  await saved();
  assert((await remote()).conteudo.content.find(node => node.type === 'taskList').content.length === 3, 'Duplicação: item interno inteiro');
  await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();
  assert((await remote()).conteudo.content.find(node => node.type === 'taskList').content.length === 2, 'Desfazer: restaura lista sem perder tarefa');

  await body.locator('p').filter({ hasText: 'Teoria 日本語 e fontes' }).click(); await body.press('End');
  await commands.getByRole('button', { name: '+ Inserir bloco', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Referência no texto', exact: true }).click();
  await pick().getByRole('textbox', { name: 'Buscar página' }).fill('Teoria alvo F10');
  await pick().getByRole('button', { name: /Teoria alvo F10/ }).click();
  await body.locator('.document-reference a').filter({ hasText: 'Teoria alvo F10' }).waitFor();
  await saved(); results.checks.push('Referência inline: busca em outra área e inserção no texto');

  await slash('pagina', 'Referência em bloco');
  await pick().getByRole('textbox', { name: 'Buscar página' }).fill('Exemplos alvo F10');
  await pick().getByRole('button', { name: /Exemplos alvo F10/ }).click(); await saved();
  assert(await body.locator('.document-reference a').count() === 2, 'Referências: dois destinos independentes no corpo');

  await slash('imagem', 'Imagem');
  await page.getByRole('dialog', { name: 'Inserir imagem' }).locator('input[type=file]').setInputFiles({ name: 'imagem-f10.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS8sAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('dialog', { name: 'Inserir imagem' }).waitFor({ state: 'detached' }); await saved();
  await page.waitForFunction(() => document.querySelector('.document-material img')?.naturalWidth > 0);
  results.checks.push('Imagem: upload real, registro e renderização no corpo');

  await slash('arquivo', 'Arquivo');
  await page.getByRole('dialog', { name: 'Inserir arquivo' }).locator('input[type=file]').setInputFiles({ name: 'anotacao-f10.txt', mimeType: 'text/plain', buffer: Buffer.from('日本語\n  indentação\n') });
  await page.getByRole('dialog', { name: 'Inserir arquivo' }).waitFor({ state: 'detached' }); await saved();
  await body.getByRole('link', { name: 'anotacao-f10.txt' }).waitFor(); results.checks.push('Arquivo: upload e referência por ID no corpo');

  await slash('link', 'Link de material');
  await page.getByRole('dialog', { name: 'Inserir link de material' }).getByRole('textbox', { name: 'URL do material' }).fill('https://example.com/f10-material');
  await page.getByRole('button', { name: 'Adicionar e inserir link' }).click();
  await page.getByRole('dialog', { name: 'Inserir link de material' }).waitFor({ state: 'detached' }); await saved();
  assert(await body.getByRole('link', { name: 'https://example.com/f10-material' }).count() === 1, 'Link: adicionado pelo menu e inserido no corpo');

  const before = (await remote()).conteudo;
  assert(!JSON.stringify(before).includes('X-Amz-'), 'Persistência: URLs assinadas ficam fora do documento');
  const blockIds = [];
  const walk = node => { if (node.attrs?.id) blockIds.push(node.attrs.id); node.content?.forEach(walk); }; walk(before);
  assert(blockIds.length > 15 && new Set(blockIds).size === blockIds.length, 'Identidade: nós e duplicações com IDs únicos');
  await page.reload(); await body.waitFor();
  await body.getByRole('link', { name: /Teoria alvo F10/ }).waitFor();
  await page.waitForFunction(() => document.querySelector('.document-material img')?.naturalWidth > 0);
  assert(JSON.stringify((await remote()).conteudo) === JSON.stringify(before), 'Recarga: documento misto preservado por nova leitura HTTP');
  assert(await page.getByRole('combobox', { name: 'Linguagem do código' }).inputValue() === 'python', 'Recarga: linguagem preservada');

  await page.evaluate(async ids => {
    const headers = { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token'), 'Content-Type': 'application/json' };
    const response = await fetch('http://localhost:3047/areas/' + ids.theory, { headers }); const theory = await response.json();
    const changed = await fetch('http://localhost:3047/areas/' + ids.theory, { method: 'PATCH', headers, body: JSON.stringify({ nome: 'Teoria renomeada F10', section: 'OUTROS', updatedAt: theory.updatedAt }) });
    if (!changed.ok) throw Error('Rename: ' + changed.status);
    const deleted = await fetch('http://localhost:3047/areas/' + ids.examples + '/trash', { method: 'PATCH', headers });
    if (!deleted.ok) throw Error('Trash: ' + deleted.status);
  }, ids);
  await page.reload(); await body.waitFor();
  await body.getByRole('link', { name: /Teoria renomeada F10/ }).waitFor();
  await body.getByText('Página indisponível', { exact: true }).waitFor();
  results.checks.push('Referências: renomear e mover conserva vínculo; lixeira mostra indisponível');

  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
    assert(size.content <= size.viewport, 'Reflow: ' + width + 'px sem overflow horizontal');
    await page.screenshot({ path: 'output/playwright/F10-' + width + '.png', fullPage: true });
  }
  assert(results.errors.length === 0, 'Navegador: nenhum erro de execução');
  return results;
}
