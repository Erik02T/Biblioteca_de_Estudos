const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eriks/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
(async () => {
  const extension = path.resolve(__dirname, '../../docs/notion/execucao/evidencias/zoom-extension');
  const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'ux04-zoom-')), { headless: true, executablePath: 'C:/Users/eriks/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe', args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`], viewport: { width: 1440, height: 900 } });
  try {
    const page = context.pages()[0];
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('biblioteca-access-token', 'ux04-zoom-fixture'));
    const item = { id: '11111111-1111-4111-8111-111111111111', nome: 'Página para zoom nativo UX-04', categoria: 'Teste isolado', section: 'LINGUAGENS', subSection: 'ESTUDANDO', nivelEntendimento: 3, updatedAt: '2026-11-15T12:00:00Z', conteudo: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto 日本語 para comandos em zoom de 200%.' }] }] } };
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://localhost:3001') return route.continue();
      if (url.pathname === '/areas') return route.fulfill({ json: { items: [item], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } } });
      if (url.pathname === `/areas/${item.id}`) return route.fulfill({ json: item });
      return route.fulfill({ json: [] });
    });
    await page.goto(`http://localhost:3001/?page=${item.id}`);
    await page.getByRole('button', { name: '+ Inserir bloco', exact: true }).waitFor();
    const before = await page.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio }));
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const zoom = await worker.evaluate(async () => { const tabs = await chrome.tabs.query({}); const tab = tabs.find(tab => tab.url?.startsWith('http://localhost:3001')); await chrome.tabs.setZoom(tab.id, 2); return chrome.tabs.getZoom(tab.id); });
    await page.waitForFunction(() => devicePixelRatio === 2);
    await page.getByRole('button', { name: '+ Inserir bloco', exact: true }).click();
    const after = await page.evaluate(() => {
      const menu = document.querySelector('[popover]'), style = getComputedStyle(menu), button = menu.querySelector('button'), buttonStyle = getComputedStyle(button);
      const luminance = color => { const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
      const a = luminance(buttonStyle.color), b = luminance(style.backgroundColor);
      return { width: innerWidth, dpr: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, menu: menu.getBoundingClientRect().toJSON(), foreground: buttonStyle.color, background: style.backgroundColor, contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, transition: buttonStyle.transitionDuration, focus: buttonStyle.outlineStyle };
    });
    assert.equal(zoom, 2); assert.equal(after.width, before.width / 2); assert.ok(after.scrollWidth <= after.width);
    assert.ok(after.menu.x >= 0 && after.menu.right <= after.width && after.menu.top >= 0 && after.menu.bottom <= 900);
    assert.ok(after.contrast >= 4.5 && after.reducedMotion);
    await page.screenshot({ path: path.join(__dirname, 'UX-04-zoom-200.png') });
    await page.keyboard.press('Escape');
    const result = { state: 'VERIFICADO', method: 'chrome.tabs.setZoom(tabId, 2)', before, after };
    fs.writeFileSync(path.join(__dirname, 'UX-04-zoom-resultados.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
