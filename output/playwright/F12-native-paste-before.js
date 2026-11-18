async (page) => {
  const { web, fixture } = __F12_SETTINGS__;
  await page.goto(web + '/?page=' + fixture.ids[15]);
  const body = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true }); await body.waitFor();
  await page.evaluate(() => {
    const button = document.createElement('button'); button.id = 'f12-native-html'; button.textContent = 'Preparar clipboard HTML F12';
    button.onclick = async () => {
      try {
        window.f12NativeMarker = 'Colagem nativa F12 日本語 ' + Date.now();
        const html = '<p>' + window.f12NativeMarker + ' <strong>permitida</strong><script>window.f12NativePasteExecuted=true</script><img src="invalid-f12" onerror="window.f12NativePasteExecuted=true"><a href="javascript:window.f12NativePasteExecuted=true">inseguro</a></p>';
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([window.f12NativeMarker + ' permitida'], { type: 'text/plain' }) })]);
        window.f12NativeClipboard = 'ready';
      } catch (error) { window.f12NativeClipboard = error.name + ': ' + error.message; }
    };
    document.body.append(button);
  });
  await page.getByRole('button', { name: 'Preparar clipboard HTML F12', exact: true }).click();
  await page.waitForFunction(() => window.f12NativeClipboard !== undefined);
  const prepared = await page.evaluate(() => window.f12NativeClipboard);
  await page.evaluate(() => document.querySelector('#f12-native-html')?.remove());
  if (prepared !== 'ready') return { passed: false, failure: prepared };
  await body.click(); await body.press('Control+End'); await body.press('Enter');
  await page.evaluate(() => { window.f12NativePasteExecuted = false; });
  return { passed: true, stage: 'ready-for-native-HTML', clipboardItemWithUserGesture: true, focused: await body.evaluate(element => element === document.activeElement) };
}
