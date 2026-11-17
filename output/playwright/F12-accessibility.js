async (page) => {
  const { web, fixture, engine, axePath } = __F12_SETTINGS__;
  const audits = [];
  const audit = async name => {
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => {
      const report = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      return { version: report.testEngine.version, violations: report.violations.map(item => ({ id: item.id, impact: item.impact, description: item.description, help: item.help, nodes: item.nodes.map(node => ({ target: node.target, failureSummary: node.failureSummary })) })), incomplete: report.incomplete.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), passedRules: report.passes.length };
    });
    audits.push({ name, ...result });
  };
  try {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(web + '/?section=LINGUAGENS&scope=ALL&layout=TABLE'); await page.locator('tbody tr').first().waitFor(); await audit('Tabela desktop');
    await page.getByRole('combobox', { name: 'Visualização:', exact: true }).selectOption('BOARD'); await page.locator('article').first().waitFor(); await audit('Quadro desktop');
    await page.goto(web + '/?page=' + fixture.source); await page.getByRole('textbox', { name: 'Conteúdo da página', exact: true }).waitFor(); await audit('Documento misto desktop');
    await page.setViewportSize({ width: 320, height: 960 }); await audit('Documento em 320 CSS px');
    await page.getByRole('button', { name: 'Propriedades', exact: true }).click(); await audit('Propriedades em 320 CSS px');
    return { passed: audits.every(item => item.violations.length === 0), engine, audits, screenReader: 'pending-human', conformityClaim: false };
  } catch (error) { return { passed: false, audits, failure: error.message }; }
}
