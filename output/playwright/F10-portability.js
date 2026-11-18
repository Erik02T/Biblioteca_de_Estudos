async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3048') throw Error('Use isolated F10 frontend');
  page.setDefaultTimeout(8000);
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('f10-fixture')));
  const results = { checks: [] };
  const versionName = 'Documento misto F10 ' + Date.now();
  const versionLabel = new RegExp('^' + versionName);
  const assert = (condition, label) => { if (!condition) throw Error(label); results.checks.push(label); };
  const body = page.getByRole('textbox', { name: 'Conteúdo da página' });
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor({ timeout: 12000 });
  const read = async id => page.evaluate(async id => {
    const response = await fetch('http://localhost:3047/areas/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!response.ok) throw Error('Remote read: ' + response.status); return response.json();
  }, id);
  await page.goto('http://localhost:3048/?page=' + ids.main); await body.waitFor();
  const before = (await read(ids.main)).conteudo;
  await page.getByRole('button', { name: 'Mais opções da página' }).click();
  await page.getByRole('menuitem', { name: 'Versões', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Versões da página', exact: true });
  await dialog.getByRole('textbox', { name: 'Nome da versão' }).fill(versionName);
  await dialog.getByRole('button', { name: 'Criar versão', exact: true }).click();
  await dialog.getByRole('button', { name: versionLabel }).waitFor();
  await dialog.getByRole('button', { name: versionLabel }).click();
  await dialog.getByRole('region', { name: 'Pré-visualização da versão' }).waitFor();
  assert(await dialog.getByRole('link', { name: 'imagem-f10.png' }).count() > 0, 'Versão: mídia do documento é preservada');
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
  await body.press('Control+End'); await page.keyboard.type('Texto posterior à versão'); await saved();
  await page.getByRole('button', { name: 'Mais opções da página' }).click();
  await page.getByRole('menuitem', { name: 'Versões', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Versões da página', exact: true });
  await dialog.getByRole('button', { name: versionLabel }).click();
  await dialog.getByRole('checkbox', { name: /Restaurar esta versão/ }).check();
  await dialog.getByRole('button', { name: 'Restaurar versão', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  // Existing restore flow returns to the collection; reopen the same stable page ID.
  await page.goto('http://localhost:3048/?page=' + ids.main); await body.waitFor();
  const restored = (await read(ids.main)).conteudo;
  const stripMediaIds = node => {
    const next = structuredClone(node);
    const walk = value => { if (value.attrs?.attachmentId) delete value.attrs.attachmentId; value.content?.forEach(walk); }; walk(next); return next;
  };
  assert(JSON.stringify(stripMediaIds(restored)) === JSON.stringify(stripMediaIds(before)), 'Restauração: documento misto idêntico com anexos remapeados');
  await page.waitForFunction(() => document.querySelector('.document-material img')?.naturalWidth > 0);
  assert((await body.innerText()).includes('Teoria renomeada F10'), 'Restauração: referências continuam resolvidas pelo destino');

  await page.getByRole('button', { name: 'Mais opções da página' }).click();
  await page.getByRole('menuitem', { name: 'Exportar', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('dialog', { name: 'Exportar página', exact: true }).getByRole('button', { name: 'Baixar ZIP', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs('output/playwright/F10-documento-misto.zip');
  assert(await download.failure() === null, 'Exportação: ZIP real com documento e materiais');
  await page.getByRole('dialog', { name: 'Exportar página', exact: true }).getByRole('button', { name: 'Fechar', exact: true }).click();

  await page.getByRole('button', { name: 'Mais opções da página' }).click();
  await page.getByRole('menuitem', { name: 'Duplicar página', exact: true }).click();
  await page.waitForFunction(id => new URL(location.href).searchParams.get('page') !== id, ids.main);
  await body.waitFor();
  const copyId = new URL(page.url()).searchParams.get('page');
  const copy = await read(copyId);
  const original = await read(ids.main);
  const sourceImage = original.conteudo.content.find(node => node.type === 'image').attrs.attachmentId;
  const copiedImage = copy.conteudo.content.find(node => node.type === 'image').attrs.attachmentId;
  assert(copyId !== ids.main && sourceImage !== copiedImage, 'Duplicação de página: novo ID e mídia independente');
  await page.evaluate(async ({ main, sourceImage }) => {
    const response = await fetch('http://localhost:3047/attachments/' + sourceImage, { method: 'DELETE', headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!response.ok) throw Error('Fixture removal: ' + response.status);
  }, { main: ids.main, sourceImage });
  await page.reload(); await body.waitFor();
  await page.waitForFunction(() => document.querySelector('.document-material img')?.naturalWidth > 0);
  assert((await read(copyId)).conteudo.content.find(node => node.type === 'image').attrs.attachmentId === copiedImage, 'Independência: remover material original não quebra a cópia');
  await page.evaluate(id => localStorage.setItem('f10-media-fixture', id), copyId);
  await page.screenshot({ path: 'output/playwright/F10-final-1440.png', fullPage: true });
  return results;
}
