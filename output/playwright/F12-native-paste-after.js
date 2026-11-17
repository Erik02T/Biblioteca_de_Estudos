async (page) => {
  const { api, fixture } = __F12_SETTINGS__;
  const checks = [];
  try {
    const marker = await page.evaluate(() => window.f12NativeMarker);
    if (!marker) throw Error('Prepare the native clipboard in this page first');
    await page.keyboard.press('Control+V');
    const body = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true });
    await body.getByText(marker, { exact: false }).waitFor();
    await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
    if (await page.evaluate(() => window.f12NativePasteExecuted) || await body.locator('script, [onerror], a[href^="javascript:"]').count()) throw Error('Active HTML was retained or executed');
    checks.push('Ctrl+V nativo recebe HTML japonês e preserva formatação permitida sem executar script/evento/URL ativa');
    const stored = await page.evaluate(async ({ api, id }) => { const response = await fetch(api + '/areas/' + id, { headers: { Authorization: 'Bearer ' + localStorage.getItem('biblioteca-access-token') } }); if (!response.ok) throw Error('Read ' + response.status); return response.json(); }, { api, id: fixture.ids[15] });
    if (!JSON.stringify(stored.conteudo).includes(marker) || JSON.stringify(stored.conteudo).includes('javascript:')) throw Error('Server did not retain safe pasted content');
    checks.push('Nova leitura do servidor confirma o texto permitido');
    return { passed: true, nativeBrowserHTMLClipboard: true, checks };
  } catch (error) { return { passed: false, checks, failure: error.message }; }
}
