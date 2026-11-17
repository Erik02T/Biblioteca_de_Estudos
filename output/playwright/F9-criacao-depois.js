// Repeat the failed creation in the same browser after migrating the clone.
async page => {
  if (new URL(page.url()).origin !== 'http://localhost:3028') throw Error('Isolated frontend required');
  const pending = page.waitForResponse(response => response.url() === 'http://localhost:3027/areas' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar página', exact: true }).click();
  const response = await pending;
  if (response.status() !== 201) throw Error('Creation still fails: ' + response.status());
  const created = await response.json();
  await page.waitForURL('**/?page=' + created.id);
  await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
  await page.reload();
  const title = page.getByRole('textbox', { name: 'Nome da página' });
  await title.waitFor();
  if (await title.inputValue() !== 'F9 reparo — criação') throw Error('Reopen lost title');
  if (!(await page.getByRole('textbox', { name: 'Conteúdo da página' }).innerText()).includes('日本語')) throw Error('Reopen lost body');
  const total = await page.evaluate(async () => {
    const response = await fetch('http://localhost:3027/areas', { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } });
    if (!response.ok) throw Error('Fixture list ' + response.status);
    return (await response.json()).pagination.total;
  });
  if (total !== 1) throw Error('Retry duplicated the page');
  await page.screenshot({ path: 'output/playwright/F9-criacao-depois.png', fullPage: true });
  return { status: 201, onePage: true, titleAndBodyAfterReload: true };
}
