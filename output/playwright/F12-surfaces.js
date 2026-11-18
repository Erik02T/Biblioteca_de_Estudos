async (page) => {
  const { web, fixture, engine } = __F12_SETTINGS__;
  const checks = [], errors = [];
  const listener = error => errors.push(error.message); page.on('pageerror', listener);
  page.setDefaultTimeout(10000);
  const check = (name, value, detail) => { if (!value) throw Error(name + ': ' + JSON.stringify(detail)); checks.push({ name, passed: true, ...(detail ? { detail } : {}) }); };
  const dimensions = () => page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  try {
    await page.goto(web + '/?section=LINGUAGENS&scope=ALL&layout=LIST');
    for (const width of [320, 375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      for (const layout of ['LIST', 'TABLE', 'BOARD']) {
        await page.getByRole('combobox', { name: 'Visualização:', exact: true }).selectOption(layout);
        if (layout === 'TABLE') await page.locator('tbody tr').first().waitFor();
        else await page.locator('article').first().waitFor();
        const sizes = await dimensions();
        check(`${layout} em ${width}px mantém rolagem na superfície permitida`, sizes.document <= sizes.viewport + 1, sizes);
      }
    }
    await page.goto(web + '/?page=' + fixture.source);
    const body = page.getByRole('textbox', { name: 'Conteúdo da página', exact: true }); await body.waitFor();
    for (const width of [320, 375, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: width === 1280 ? 720 : 960 });
      const sizes = await dimensions(); check(`Documento em ${width}px sem overflow global`, sizes.document <= sizes.viewport + 1, sizes);
      if (width === 320 || width === 1440) await page.screenshot({ path: `output/playwright/F12-${engine}-documento-${width}.png`, fullPage: true });
    }
    await page.getByRole('textbox', { name: 'Nome da página', exact: true }).focus(); await page.keyboard.press('Enter');
    check('Enter no título leva o foco ao editor', await body.evaluate(element => element === document.activeElement || element.contains(document.activeElement)));
    await page.getByRole('button', { name: 'Mais opções da página', exact: true }).click(); await page.keyboard.press('Escape');
    check('Escape devolve o foco ao acionador do menu', await page.getByRole('button', { name: 'Mais opções da página', exact: true }).evaluate(element => element === document.activeElement));
    await page.goto(web + '/?section=LINGUAGENS&scope=ALL');
    await page.setViewportSize({ width: 320, height: 960 });
    const models = page.getByRole('button', { name: 'Modelos', exact: true }); await models.click();
    const dialog = page.getByRole('dialog', { name: 'Modelos de páginas', exact: true }); await dialog.waitFor();
    check('Galeria cabe em 320 CSS px', await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
    const controls = dialog.locator('button:visible, input:visible, select:visible');
    const last = controls.last(); await last.focus(); await page.keyboard.press('Tab');
    check('Tab permanece dentro do diálogo modal', await dialog.evaluate(element => element.contains(document.activeElement)));
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    check('Escape fecha modal e devolve foco', await models.evaluate(element => element === document.activeElement));
    check('Superfícies sem erro de execução', errors.length === 0, errors);
    return { passed: true, checks, errors, nativeZoom: 'pending-human', physicalTouch: 'pending-human' };
  } catch (error) { await page.screenshot({ path: `output/playwright/F12-${engine}-superficies-falha.png`, fullPage: true }); return { passed: false, checks, errors, failure: error.message }; }
  finally { page.off('pageerror', listener); }
}
