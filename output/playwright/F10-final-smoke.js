async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3048') throw Error('Use isolated F10 frontend');
  page.setDefaultTimeout(8000);
  const mediaId = await page.evaluate(() => localStorage.getItem('f10-media-fixture'));
  const results = { checks: [], errors: [] };
  page.on('pageerror', error => results.errors.push(error.message));
  const assert = (condition, label) => { if (!condition) throw Error(label); results.checks.push(label); };
  const id = await page.evaluate(async () => {
    const p = text => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] });
    const response = await fetch('http://localhost:3047/areas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') }, body: JSON.stringify({ nome: 'Fixture final de blocos F10', categoria: 'Fixture F10', section: 'LINGUAGENS', subSection: 'ESTUDANDO', conteudo: { type: 'doc', content: [p('Antes'), { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [p('Tarefa A 日本語')] }] }, { type: 'toggleBlock', attrs: { open: true, summary: 'Exemplos' }, content: [p('Dentro um'), p('Dentro dois')] }, p('Depois')] } }) });
    if (!response.ok) throw Error('Fixture: ' + response.status); return (await response.json()).id;
  });
  await page.goto('http://localhost:3048/?page=' + id);
  const body = page.getByRole('textbox', { name: 'Conteúdo da página' }); await body.waitFor();
  const commands = page.getByRole('group', { name: 'Comandos do documento', exact: true });
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor({ timeout: 12000 });
  const action = async name => { await commands.getByRole('button', { name: 'Ações do bloco', exact: true }).click(); await page.getByRole('menuitem', { name, exact: true }).click(); };
  const before = await body.evaluate(element => element.editor.getJSON());
  await body.locator('.toggle-content p').filter({ hasText: 'Dentro dois' }).click();
  await action('Selecionar grupo pai'); await action('Duplicar bloco');
  await page.waitForFunction(() => [...document.querySelectorAll('p')].some(element => element.textContent.startsWith('Bloco atual: Alternante')));
  assert((await page.getByText(/^Bloco atual:/).innerText()).includes('Alternante'), 'Build final: duplicar mantém o grupo inteiro selecionado');
  await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();
  assert(JSON.stringify(await body.evaluate(element => element.editor.getJSON())) === JSON.stringify(before), 'Build final: desfazer duplicação conserva o grupo original');
  const task = body.locator('li p').filter({ hasText: 'Tarefa A 日本語' });
  // Replace only this fixture item's line, keeping the actual task container.
  await task.click({ position: { x: 30, y: 12 } });
  await page.waitForFunction(() => document.querySelector('.ProseMirror').editor.state.selection.$from.depth >= 3);
  await page.keyboard.press('Home'); await page.keyboard.press('Shift+End'); await page.keyboard.type('/codigo');
  await page.getByRole('menuitem', { name: 'Código', exact: true }).click();
  const nested = body.locator('li .document-code code').first(); await nested.waitFor({ state: 'attached' });
  await page.keyboard.type('SELECT 1;'); await body.press('Escape');
  assert(new URL(page.url()).searchParams.get('page') === id, 'Build final: Escape sai do código sem navegar para fora');
  assert(await body.evaluate(element => element.editor.state.selection.$from.parent.type.name === 'paragraph'), 'Build final: foco em parágrafo válido após código aninhado');
  await saved();
  await page.reload(); await body.waitFor();
  assert(await body.locator('li .document-code code').first().textContent() === 'SELECT 1;', 'Build final: código em item de lista persiste após recarga');
  if (mediaId) {
    await page.goto('http://localhost:3048/?page=' + mediaId); await body.waitFor();
    await page.waitForFunction(() => document.querySelector('.document-material img')?.naturalWidth > 0);
    assert(await body.locator('.document-reference a').count() >= 1, 'Build final: mídia e referências continuam funcionais');
  }
  await page.screenshot({ path: 'output/playwright/F10-final-1440.png', fullPage: true });
  assert(results.errors.length === 0, 'Build final: nenhum erro de execução');
  return results;
}
