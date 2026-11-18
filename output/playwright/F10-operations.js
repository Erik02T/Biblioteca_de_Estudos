async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3048') throw Error('Use isolated F10 frontend');
  page.setDefaultTimeout(8000);
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('f10-fixture')));
  const results = { checks: [], errors: [] };
  page.on('pageerror', error => results.errors.push(error.message));
  const assert = (condition, label) => { if (!condition) throw Error(label); results.checks.push(label); };
  const body = page.getByRole('textbox', { name: 'Conteúdo da página' });
  const commands = page.getByRole('group', { name: 'Comandos do documento', exact: true });
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor({ timeout: 12000 });
  const read = async (path = '/areas/' + ids.main) => page.evaluate(async path => {
    const response = await fetch('http://localhost:3047' + path, { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!response.ok) throw Error('Read: ' + response.status); return response.json();
  }, path);
  const action = async name => { await commands.getByRole('button', { name: 'Ações do bloco', exact: true }).click(); await page.getByRole('menuitem', { name, exact: true }).click(); };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3048/?page=' + ids.main); await body.waitFor();
  const before = (await read()).conteudo;
  const source = body.locator('.toggle-content p').filter({ hasText: 'Dentro dois' });
  const target = body.locator('.toggle-content p').filter({ hasText: 'Dentro um' });
  await source.scrollIntoViewIfNeeded();
  await source.hover({ position: { x: 90, y: 14 } });
  const handle = page.getByRole('button', { name: 'Arrastar bloco', exact: true });
  await handle.waitFor({ state: 'visible' });
  await handle.dragTo(target, { targetPosition: { x: 25, y: 1 } }); await saved();
  const dragged = (await read()).conteudo.content.find(node => node.type === 'toggleBlock');
  assert(dragged.content[0].content[0].text === 'Dentro dois', 'Arraste: move bloco interno com indicador de destino');
  await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();
  assert(JSON.stringify((await read()).conteudo) === JSON.stringify(before), 'Arraste: desfazer recupera JSON completo');
  await source.click(); await body.press('Alt+Shift+ArrowUp'); await saved();
  assert(JSON.stringify((await read()).conteudo.content.find(node => node.type === 'toggleBlock')) === JSON.stringify(dragged), 'Equivalência: arraste e teclado produzem o mesmo grupo');
  await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();
  await source.click(); await action('Mover para…');
  await page.getByRole('menuitem', { name: 'Antes de Dentro um · nível 2', exact: true }).click(); await saved();
  assert(JSON.stringify((await read()).conteudo.content.find(node => node.type === 'toggleBlock')) === JSON.stringify(dragged), 'Equivalência: Mover para produz o mesmo grupo');
  await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();
  await source.click(); await action('Selecionar grupo pai'); await action('Duplicar bloco'); await saved();
  assert((await read()).conteudo.content.filter(node => node.type === 'toggleBlock').length === 2, 'Grupo pai: duplicação inclui o conteúdo interno');
  await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();

  const media = body.locator('.document-material').filter({ has: page.locator('img') });
  const imageId = before.content.find(node => node.type === 'image').attrs.attachmentId;
  await media.click({ position: { x: 4, y: 4 } }); await action('Excluir bloco'); await saved();
  assert(!(await read()).conteudo.content.some(node => node.type === 'image'), 'Mídia: excluir bloco remove somente referência');
  assert((await read('/attachments?areaId=' + ids.main)).some(item => item.id === imageId), 'Mídia: arquivo continua anexado após remover bloco');
  await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();
  await media.click({ position: { x: 4, y: 4 } }); await action('Duplicar bloco'); await saved();
  const images = (await read()).conteudo.content.filter(node => node.type === 'image');
  assert(images.length === 2 && images[0].attrs.id !== images[1].attrs.id && images[0].attrs.attachmentId === images[1].attrs.attachmentId, 'Mídia: duplicação usa novo ID de bloco e conserva attachmentId');
  await commands.getByRole('button', { name: 'Desfazer', exact: true }).click(); await saved();

  let imageRequests = 0, attachmentReads = 0;
  const observe = request => { if (request.url().includes('/attachments/' + imageId)) attachmentReads += 1; };
  page.on('request', observe);
  await page.route('http://localhost:9000/**', async route => {
    if (route.request().resourceType() === 'image') { imageRequests += 1; if (imageRequests === 1) return route.fulfill({ status: 403, body: 'Expired fixture URL' }); }
    return route.continue();
  });
  await page.reload(); await body.waitFor();
  await page.waitForFunction(() => document.querySelector('.document-material img')?.naturalWidth > 0);
  assert(imageRequests >= 2 && attachmentReads >= 2, 'URL expirada: falha de imagem renova URL pelo ID e recupera preview');
  await page.unroute('http://localhost:9000/**'); page.off('request', observe);
  assert(JSON.stringify((await read()).conteudo) === JSON.stringify(before), 'Resolvedores: renovação não altera o documento salvo');

  await body.press('Control+End'); await body.press('Enter'); await page.keyboard.type('/arquivo');
  await page.getByRole('menuitem', { name: 'Arquivo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Inserir arquivo' });
  await dialog.locator('input[type=file]').setInputFiles({ name: 'blocked.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ-invalid-fixture') });
  await dialog.getByRole('alert').waitFor();
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
  assert((await body.innerText()).includes('/arquivo'), 'Upload inválido: erro explícito e comando preservado');
  await body.press('Control+End'); await body.press('Home'); await body.press('Shift+End'); await body.press('Backspace');
  await saved();

  await body.press('Control+End'); await page.keyboard.type('Pendência antes da referência 日本語');
  await body.getByRole('link', { name: /Teoria renomeada F10/ }).click();
  await page.waitForURL('**/?page=' + ids.theory); await body.waitFor();
  assert(JSON.stringify((await read()).conteudo).includes('Pendência antes da referência 日本語'), 'Navegação por referência confirma alterações pendentes');
  await page.goBack(); await page.waitForURL('**/?page=' + ids.main); await body.waitFor();
  assert((await body.innerText()).includes('Pendência antes da referência 日本語'), 'Voltar: retoma o documento sem perder conteúdo');
  assert(results.errors.length === 0, 'Operações: nenhum erro de execução');
  return results;
}
