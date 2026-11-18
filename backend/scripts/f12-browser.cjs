// CLI-first browser orchestration; credentials stay in generated private scripts/logs.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, privateDir, publicDir } = require('./f12-environment.cjs');
const [engine, script = 'journey'] = process.argv.slice(2);
if (!['chromium', 'firefox'].includes(engine) || !/^[a-z0-9-]+$/.test(script)) throw Error('Use chromium|firefox and an F12 scenario name');
let cli = process.env.F12_PLAYWRIGHT_CLI;
if (!cli) {
  const cache = path.join(process.env.LOCALAPPDATA || '', 'npm-cache/_npx');
  for (const entry of fs.readdirSync(cache)) {
    const candidate = path.join(cache, entry, 'node_modules/@playwright/cli/playwright-cli.js');
    if (fs.existsSync(candidate)) { cli = candidate; break; }
  }
}
if (!cli || !fs.existsSync(cli)) throw Error('Install @playwright/cli or set F12_PLAYWRIGHT_CLI to playwright-cli.js');
if (['open', 'close', 'force-close'].includes(script)) {
  const session = '-s=f12-' + engine;
  const profile = path.join(privateDir, engine + '-profile');
  if (script === 'force-close') {
    const preparation = JSON.parse(fs.readFileSync(path.join(publicDir, `F12-${engine}-recovery-before-resultados.json`), 'utf8'));
    if (!preparation.passed || !preparation.durableIndexedDB || Date.now() - Date.parse(preparation.verifiedAt) > 5 * 60 * 1000) throw Error('A fresh, successful durable-draft check is required before forced exit');
    const processName = engine === 'chromium' ? 'chrome.exe' : 'firefox.exe';
    const command = `Get-CimInstance Win32_Process -Filter "Name='${processName}'" | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress`;
    const inspection = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true });
    if (inspection.status !== 0) throw Error('Cannot inspect test browser processes');
    const parsed = JSON.parse(inspection.stdout || '[]');
    const candidates = (Array.isArray(parsed) ? parsed : [parsed]).filter(item => item.CommandLine?.includes(profile) && (engine !== 'chromium' || !item.CommandLine.includes('--type=')));
    const roots = candidates.filter(item => !candidates.some(parent => parent.ProcessId === item.ParentProcessId));
    if (roots.length !== 1) throw Error('Expected exactly one root browser with the exclusive F12 profile');
    process.kill(roots[0].ProcessId);
    const event = { verifiedAt: new Date().toISOString(), passed: true, engine, forced: true, pid: roots[0].ProcessId, profileValidated: true };
    fs.writeFileSync(path.join(publicDir, `F12-${engine}-forced-exit-resultados.json`), JSON.stringify(event, null, 2) + '\n');
    // Close the now-disconnected CLI session, without deleting the profile.
    spawnSync(process.execPath, [cli, session, 'close'], { cwd: root, windowsHide: true, timeout: 20000 });
    console.log(JSON.stringify(event));
  } else {
    const args = script === 'open' ? [session, 'open', 'http://localhost:3068', '--browser', engine === 'chromium' ? 'chrome' : 'firefox', '--profile', profile] : [session, 'close'];
    const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 45000 });
    fs.writeFileSync(path.join(privateDir, engine + '-' + script + '.log'), (result.stdout || '') + (result.stderr || ''));
    if (result.status !== 0) throw Error('Browser lifecycle failed; inspect private log');
    console.log(JSON.stringify({ engine, action: script, passed: true }));
  }
  process.exit(0);
}
if (script === 'replay-f9-icon') {
  const step = args => {
    const result = spawnSync(process.execPath, [cli, '-s=f12-' + engine, ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 });
    fs.writeFileSync(path.join(privateDir, engine + '-icon-' + args[0] + '.log'), (result.stdout || '') + (result.stderr || ''));
    if (result.status !== 0) throw Error('Native icon dialog step failed');
    return result.stdout;
  };
  const snapshot = step(['find', 'Escolher ícone']);
  const ref = snapshot.match(/button "Escolher ícone" \[ref=([^\]]+)\]/)?.[1];
  if (!ref) throw Error('Icon button not present in a fresh snapshot');
  step(['click', ref]); step(['dialog-accept', '🌸']);
}
const fixture = JSON.parse(fs.readFileSync(path.join(privateDir, 'fixtures.json'), 'utf8'));
const accountName = script === 'performance' ? 'volume' : engine;
const settings = { engine, account: fixture.accounts[accountName], other: fixture.accounts.other, fixture: fixture.fixtures[engine], volume: { ids: fixture.volume.ids }, api: 'http://localhost:3067', web: 'http://localhost:3068', axePath: path.join(privateDir, 'tooling/node_modules/axe-core/axe.min.js') };
const replays = { 'replay-f9-navigation': 'F9-navegacao.js', 'replay-f9-presentation': 'F9-apresentacao.js', 'replay-f9-icon': 'F9-icone.js', 'replay-f11-setup': 'F11-setup.js', 'replay-f11-models': 'F11-models.js', 'replay-f11-collections': 'F11-collections.js', 'replay-f10-setup': 'F10-setup.js', 'replay-f10-browser': 'F10-browser.js', 'replay-f10-operations': 'F10-operations.js', 'replay-f10-portability': 'F10-portability.js' };
let template = replays[script]
  ? fs.readFileSync(path.join(publicDir, replays[script]), 'utf8').replaceAll('localhost:3058', 'localhost:3068').replaceAll('localhost:3057', 'localhost:3067').replaceAll('localhost:3048', 'localhost:3068').replaceAll('localhost:3047', 'localhost:3067').replaceAll('localhost:3028', 'localhost:3068').replaceAll('localhost:3027', 'localhost:3067').replaceAll('output/playwright/F11', `output/playwright/F12-${engine}-F11`).replaceAll('output/playwright/F10', `output/playwright/F12-${engine}-F10`).replaceAll('output/playwright/F9', `output/playwright/F12-${engine}-F9`)
  : fs.readFileSync(path.join(publicDir, `F12-${script}.js`), 'utf8');
if (engine === 'firefox' && script === 'replay-f10-browser') {
  // Gecko does not implement Playwright's Chromium clipboard permission names.
  // Verify the real clipboard with a trusted Ctrl+V into a temporary textarea.
  template = template.replace("await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3068' });", '');
  template = template.replace('await page.evaluate(() => navigator.clipboard.readText())', `await (async () => {
    await page.evaluate(() => { const field = document.createElement('textarea'); field.id = 'f12-gecko-clipboard'; document.body.append(field); });
    const field = page.locator('#f12-gecko-clipboard'); await field.focus(); await page.keyboard.press('Control+V');
    const text = await field.inputValue(); await field.evaluate(element => element.remove()); return text;
  })()`);
}
if (replays[script]) template = `async (page) => { if (${script.endsWith('-setup')} || new URL(page.url()).origin !== 'http://localhost:3068') await page.goto('http://localhost:3068'); return (${template})(page); }`;
const generated = path.join(privateDir, engine + '-' + script + '.js');
fs.writeFileSync(generated, template.replace('__F12_SETTINGS__', JSON.stringify(settings)));
const started = Date.now();
const result = spawnSync(process.execPath, [cli, '-s=f12-' + engine, 'run-code', '--filename', generated, '--raw'], { cwd: root, encoding: 'utf8', maxBuffer: 24 * 1024 * 1024, windowsHide: true });
const raw = (result.stdout || '') + (result.stderr || '');
fs.writeFileSync(path.join(privateDir, engine + '-' + script + '.log'), raw);
let data;
try { data = JSON.parse(result.stdout); } catch { data = { passed: false, error: 'CLI did not return JSON. Inspect the private scenario log; raw output is never published.', cliExitCode: result.status, cliSignal: result.signal, cliError: result.error?.message, outputBytes: raw.length }; }
if (Array.isArray(data)) data = { passed: data.every(item => item.passed !== false), checks: data };
if (data && typeof data === 'object' && !('passed' in data)) data.passed = !data.isError && !data.error && (!Array.isArray(data.errors) || data.errors.length === 0);
if (result.status !== 0 || result.error || data?.isError) data.passed = false;
const report = { verifiedAt: new Date().toISOString(), engine, script, seconds: (Date.now() - started) / 1000, ...data };
fs.writeFileSync(path.join(publicDir, `F12-${engine}-${script}-resultados.json`), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ verifiedAt: report.verifiedAt, engine, script, passed: report.passed, seconds: report.seconds, checks: report.checks?.length, audits: report.audits?.map(item => ({ name: item.name, violations: item.violations.length })), failure: report.failure || report.error, metrics: report.metrics }, null, 2));
if (report.passed === false) process.exitCode = 1;
