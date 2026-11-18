// Run only against the pre-migration clone served by f9-creation-upgrade.cjs.
async page => {
  if (new URL(page.url()).origin !== 'http://localhost:3028') throw Error('Isolated frontend required');
  await page.evaluate(async () => {
    const response = await fetch('http://localhost:3027/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'f9-before-' + crypto.randomUUID() + '@example.com', password: 'F9-browser-repair-12345' }) });
    if (response.status !== 201) throw Error('Fixture registration ' + response.status);
    const tokens = await response.json();
    localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken);
  });
  await page.goto('http://localhost:3028/?section=LINGUAGENS');
  await page.getByRole('button', { name: '+ Nova página', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome da página' }).fill('F9 reparo — criação');
  await page.getByRole('textbox', { name: 'Conteúdo da página' }).fill('Texto preservado para nova tentativa 日本語');
  const pending = page.waitForResponse(response => response.url() === 'http://localhost:3027/areas' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Criar página', exact: true }).click();
  const response = await pending;
  if (response.status() !== 500) throw Error('Original failure was not reproduced: ' + response.status());
  const result = await response.json();
  if (result.message !== 'Erro interno do servidor') throw Error('Unexpected server message');
  await page.getByTestId('save-status').filter({ hasText: /Atenção/ }).waitFor();
  if (await page.getByRole('textbox', { name: 'Nome da página' }).inputValue() !== 'F9 reparo — criação') throw Error('Failed creation discarded draft');
  await page.screenshot({ path: 'output/playwright/F9-criacao-antes.png', fullPage: true });
  return { status: 500, message: result.message, draftPreserved: true };
}
