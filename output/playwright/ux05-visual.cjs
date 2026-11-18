// Isolated HTTP fixtures for layout/state checks; never forwards requests to an external API.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eriks/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('node:fs'), assert = require('node:assert/strict');
const phase = process.argv[2] || 'antes';
const artifact = process.env.UX_ARTIFACT_PREFIX || 'UX-05';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = { phase, layouts: [], checks: [], errors: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => results.errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('biblioteca-access-token', 'ux05-layout-fixture'));
    const item = { id: '11111111-1111-4111-8111-111111111111', nome: 'Página de teste — 日本語 e programação com título extenso', categoria: 'Categoria de teste', section: 'LINGUAGENS', subSection: 'ESTUDANDO', nivelEntendimento: 3, updatedAt: '2026-11-15T12:00:00Z', conteudo: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto isolado para verificar leitura e seleção. 日本語' }] }] } };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://localhost:3001') return route.continue();
      if (url.pathname === '/areas') return route.fulfill({ json: { items: [item], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } } });
      if (url.pathname.startsWith('/areas/' + item.id)) return route.fulfill({ json: item });
      return route.fulfill({ json: [] });
    });
    const button = name => page.getByRole('button', { name, exact: true });
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('http://localhost:3001/?page=' + item.id);
      await page.locator('.tiptap').waitFor();
      await page.locator('.tiptap').evaluate(el => { el.dataset.ux05Instance = 'retained'; });
      for (const tool of [null, 'Propriedades', 'Materiais (0)', 'Formatar']) {
        if (tool) await button(tool).click();
        const measure = await page.evaluate(() => {
          const doc = document.querySelector('.tiptap'), name = document.querySelector('[aria-label="Nome da página"]');
          const dialog = document.querySelector('#editor-tool'), panel = dialog.open ? dialog.getBoundingClientRect() : null;
          const controls = panel ? [...dialog.querySelectorAll('button,input,select')].filter(el => el.getClientRects().length) : [];
          const boxes = controls.map(el => ({ label: el.getAttribute('aria-label') || el.textContent || el.tagName, ...el.getBoundingClientRect().toJSON() }));
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, editorWidth: doc.getBoundingClientRect().width, document: doc.getBoundingClientRect().toJSON(), rootPadding: getComputedStyle(document.querySelector('main')).padding, titleFont: getComputedStyle(name).fontSize, panel: panel?.toJSON(), controls: boxes, overlaps: boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => Math.min(a.right,b.right) > Math.max(a.left,b.left) + 1 && Math.min(a.bottom,b.bottom) > Math.max(a.top,b.top) + 1).map(b => [a.label,b.label])) };
        });
        results.layouts.push({ tool, ...measure });
        if ([320, 1440].includes(width) && [null, 'Propriedades'].includes(tool)) await page.screenshot({ path: `output/playwright/${artifact}-${phase}-${tool || 'documento'}-${width}.png` });
        if (phase === 'depois') {
          assert.ok(measure.scrollWidth <= width, `No page overflow: ${width}/${tool}`);
          assert.ok(measure.editorWidth >= (width < 1400 ? Math.min(width - 60, 680) : 400), `Reading width retained ${width}/${tool}: ${measure.editorWidth}`);
          assert.equal(measure.overlaps.length, 0, `Controls do not overlap ${width}/${tool}`);
          if (tool) {
            if (width >= 1400) assert.ok(measure.document.right < measure.panel.left, 'Non-modal panel does not cover the document');
            assert.ok(measure.panel.left >= 0 && measure.panel.right <= width, 'Panel within viewport');
            assert.ok(measure.controls.every(c => c.width >= 24 && c.height >= 44), `Touch targets ${width}/${tool}`);
          }
        }
        if (tool) {
          await page.keyboard.press('Escape');
          if (phase === 'depois') assert.equal(await button(tool).evaluate(el => el === document.activeElement), true, 'Focus returns');
        }
      }
      assert.equal(await page.locator('.tiptap').getAttribute('data-ux05-instance'), 'retained');
    }
    results.checks.push('Same editor DOM retained across tools and five viewport widths');
    assert.equal(await page.getByRole('main').count(), 1, 'Single main landmark');
    results.checks.push('Single main landmark with named editor region');
    await page.setViewportSize({ width: 375, height: 900 });
    await button('Propriedades').click();
    await page.waitForFunction(() => document.querySelector('#editor-tool').matches(':modal'));
    results.tabFocus = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      results.tabFocus.push(await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.slice(0, 50), inDialog: Boolean(document.activeElement.closest('#editor-tool')) })));
    }
    assert.ok(results.tabFocus.every(item => item.inDialog), 'Modal contains keyboard focus: ' + JSON.stringify(results.tabFocus));
    await page.keyboard.press('Escape');
    results.checks.push('Modal contains Tab focus and returns to trigger with Escape');
    results.contrasts = await page.evaluate(() => {
      const lum = color => { const values = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return values[0]*.2126 + values[1]*.7152 + values[2]*.0722; };
      const root = document.querySelector('[data-testid="editor-root"]');
      const background = getComputedStyle(root).backgroundColor;
      return ['.tiptap','[data-testid="save-status"]','[data-testid="rail-save"]','[aria-label="Nome da página"]'].map(selector => {
        const el = document.querySelector(selector), style = getComputedStyle(el);
        const bg = style.backgroundColor === 'rgba(0, 0, 0, 0)' ? background : style.backgroundColor;
        const a = lum(style.color), b = lum(bg);
        return { selector, color: style.color, background: bg, ratio: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) };
      });
    });
    if (phase === 'depois') assert.ok(results.contrasts.every(pair => pair.ratio >= 4.5), 'Text contrast');
    if (phase === 'depois') {
      await page.route('**/attachments?**', route => route.fulfill({ json: [{ id: '22222222-2222-4222-8222-222222222222', areaId: item.id, nome: 'Material_' + 'nome_longo_'.repeat(8) + '.pdf', tipo: 'ARQUIVO', url: 'https://example.invalid/material.pdf' }] }));
      await page.reload(); await page.locator('.tiptap').waitFor(); await button('Materiais (1)').click();
      results.materialLayouts = [];
      for (const width of [320, 375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const measure = await page.getByTestId('attach-slot').evaluate(el => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, link: el.querySelector('a').getBoundingClientRect().toJSON(), slot: el.getBoundingClientRect().toJSON(), remove: el.querySelector('button').getBoundingClientRect().toJSON() }));
        assert.ok(measure.scrollWidth <= width && measure.link.right <= measure.slot.right && measure.remove.width >= 44 && measure.remove.height >= 44);
        results.materialLayouts.push(measure);
        if ([320,1440].includes(width)) await page.screenshot({ path: `output/playwright/${artifact}-material-final-${width}.png` });
      }
      results.checks.push('Long material names use full panel width and keep 44px removal targets');
    }
    assert.equal(results.errors.length, 0);
  } finally {
    fs.writeFileSync(`output/playwright/${artifact}-visual-${phase}.json`, JSON.stringify(results, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
