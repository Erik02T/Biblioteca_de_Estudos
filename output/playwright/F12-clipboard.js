async (page) => {
  const { web, fixture, engine } = __F12_SETTINGS__;
  const checks = [];
  const check = (name, value, detail) => { if (!value) throw Error(name + ': ' + JSON.stringify(detail)); checks.push({ name, passed: true, ...(detail ? { detail } : {}) }); };
  try {
    await page.goto(web + '/?page=' + fixture.source);
    const body = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true }); await body.waitFor();
    const expected = await body.locator('pre code').textContent();
    const copy = page.getByRole('button', { name: 'Copiar código', exact: true });
    await copy.click(); await page.getByText('Código copiado.', { exact: true }).waitFor();
    await page.evaluate(() => { const input = document.createElement('textarea'); input.id = 'f12-clipboard'; input.setAttribute('aria-label', 'Destino temporário de clipboard F12'); document.body.append(input); });
    const target = page.getByRole('textbox', { name: 'Destino temporário de clipboard F12', exact: true });
    await target.focus(); await page.keyboard.press('Control+V');
    check('Clipboard nativo preserva japonês e indentação', (await target.inputValue()).replace(/\r\n/g, '\n') === expected.replace(/\r\n/g, '\n'));
    await page.evaluate(() => {
      window.f12ClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('F12 denied', 'NotAllowedError'); } } });
    });
    await copy.click(); await page.getByText('Não foi possível copiar. Código selecionado para cópia manual.', { exact: true }).waitFor();
    const selection = await page.evaluate(() => getSelection()?.toString());
    check('Clipboard negado informa falha e seleciona exatamente o código', selection?.replace(/\r\n/g, '\n') === expected.replace(/\r\n/g, '\n'), { selection, expected });
    await page.keyboard.press('Control+C'); await target.fill(''); await target.focus(); await page.keyboard.press('Control+V');
    check('Alternativa de cópia manual funciona após recusa', (await target.inputValue()).replace(/\r\n/g, '\n') === expected.replace(/\r\n/g, '\n'));
    await page.evaluate(() => { if (window.f12ClipboardDescriptor) Object.defineProperty(navigator, 'clipboard', window.f12ClipboardDescriptor); else delete navigator.clipboard; document.querySelector('#f12-clipboard')?.remove(); });
    await body.click(); await body.press('Control+End'); await body.press('Enter');
    await body.evaluate(element => {
      window.f12PasteExecuted = false;
      const data = new DataTransfer(); data.setData('text/html', '<p>Colagem F12 日本語 <strong>permitida</strong><script>window.f12PasteExecuted=true</script><img src="x" onerror="window.f12PasteExecuted=true"><a href="javascript:window.f12PasteExecuted=true">inseguro</a></p>');
      data.setData('text/plain', 'Colagem F12 日本語 permitida');
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await page.getByTestId('save-status').filter({ hasText: /^Salvo$/ }).waitFor();
    const pasteResult = { textPresent: (await body.innerText()).includes('Colagem F12 日本語'), executed: await page.evaluate(() => window.f12PasteExecuted), activeNodes: await body.locator('script, [onerror], a[href^="javascript:"]').count() };
    if (!pasteResult.textPresent && engine === 'firefox' && !pasteResult.executed && pasteResult.activeNodes === 0) return { passed: true, checks, nativeClipboard: true, deniedClipboard: 'injected NotAllowedError', htmlPaste: 'Firefox synthetic event did not deliver text; verify separately with native CF_HTML', physicalIME: 'pending-human', engine };
    check('Pipeline de colagem HTML preserva texto permitido sem executar conteúdo ativo', pasteResult.textPresent && !pasteResult.executed && pasteResult.activeNodes === 0, pasteResult);
    return { passed: true, checks, nativeClipboard: true, deniedClipboard: 'injected NotAllowedError', htmlPaste: 'synthetic ClipboardEvent through real editor', physicalIME: 'pending-human', engine };
  } catch (error) { return { passed: false, checks, failure: error.message }; }
  finally { await page.evaluate(() => { if ('f12ClipboardDescriptor' in window) { if (window.f12ClipboardDescriptor) Object.defineProperty(navigator, 'clipboard', window.f12ClipboardDescriptor); else delete navigator.clipboard; } document.querySelector('#f12-clipboard')?.remove(); }).catch(() => {}); }
}
