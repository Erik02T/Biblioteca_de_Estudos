// Run standalone or after F9-navegacao.js in an isolated CLI session.
async (page) => {
  if (new URL(page.url()).origin !== 'http://localhost:3028') throw Error('Isolated frontend required');
  const assert = (value, message) => { if (!value) throw Error(message); };
  const card = page.getByRole('button', { name: 'Rascunho F9 sem rede', exact: true });
  if (await card.count()) await card.click();
  if (!new URL(page.url()).searchParams.get('page')) {
    const created = await page.evaluate(async () => {
      const api = 'http://localhost:3027';
      const response = await fetch(api + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'f9-cover-' + crypto.randomUUID() + '@example.com', password: 'F9-fixture-12345' }) });
      if (response.status !== 201) throw Error('Fixture account ' + response.status);
      const tokens = await response.json();
      localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken);
      const result = await fetch(api + '/areas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tokens.accessToken, 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ nome: 'Apresentação F9', categoria: 'Geral', section: 'LINGUAGENS', subSection: 'ESTUDANDO', nivelEntendimento: 0, icone: '✦', conteudo: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Documento preservado' }] }] } }) });
      if (result.status !== 201) throw Error('Fixture page ' + result.status);
      return (await result.json()).id;
    });
    await page.goto('http://localhost:3028/?page=' + created);
  }
  const title = page.getByRole('textbox', { name: 'Nome da página' });
  await title.waitFor();
  const id = new URL(page.url()).searchParams.get('page');
  const saved = () => page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
  const read = () => page.evaluate(async id => {
    const response = await fetch('http://localhost:3027/areas/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!response.ok) throw Error('Fixture read ' + response.status);
    return response.json();
  }, id);
  const longTitle = 'Exercícios de japonês com exemplos, revisão das partículas e anotações para a próxima aula';
  const initialIcon = (await read()).icone;
  await title.fill(longTitle);
  await saved();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.waitForFunction(() => {
    const title = document.querySelector('[data-testid="name-input"]');
    return title && title.clientHeight >= title.scrollHeight - 2;
  });
  assert(await title.inputValue() === longTitle, 'Wrapping title lost text');
  await page.screenshot({ path: 'output/playwright/F9-titulo-375.png', fullPage: true });
  // Directly address the hidden cover input: CLI suspends scripts on native choosers.
  await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles({ name: 'f9-capa.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Reposicionar capa', exact: true }).waitFor();
  await saved();
  const attachmentId = (await read()).coverAttachmentId;
  assert(Boolean(attachmentId), 'Cover not associated by ID');
  await page.getByRole('button', { name: 'Reposicionar capa', exact: true }).click();
  await page.getByRole('slider', { name: 'Posição de recorte da capa' }).fill('75');
  await page.getByRole('button', { name: 'Concluir recorte' }).click();
  await saved();
  await page.reload(); await title.waitFor();
  await page.getByRole('button', { name: 'Reposicionar capa' }).waitFor();
  const remote = await read();
  assert(remote.coverAttachmentId === attachmentId && remote.coverPosition === 75 && remote.icone === initialIcon && remote.nome === longTitle, 'Reopen lost presentation');
  await page.screenshot({ path: 'output/playwright/F9-capa-375.png', fullPage: true });
  // 720 CSS px reproduces the layout viewport of 1440 px at 200% zoom.
  await page.setViewportSize({ width: 720, height: 900 });
  const reflow = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert(reflow.content <= reflow.width, 'Overflow at 200% layout equivalent');
  await page.getByRole('button', { name: 'Remover capa' }).click(); await saved();
  assert((await read()).coverAttachmentId === null, 'Cover removal did not persist');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/F9-documento-1440.png', fullPage: true });
  return { wrappingTitle: true, coverCropAndReopen: true, coverRemoval: true, zoomLayoutEquivalent: reflow };
}
