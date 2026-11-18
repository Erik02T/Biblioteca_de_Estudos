// Opens only dedicated visible test profiles for the owner's guided acceptance.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, privateDir, publicDir } = require('./f12-environment.cjs');
const engine = process.argv[2] || 'chromium';
const volume = process.argv[3] === 'volume';
if (!['chromium', 'firefox'].includes(engine)) throw Error('Use chromium or firefox');
let cli = process.env.F12_PLAYWRIGHT_CLI;
if (!cli) {
  const cache = path.join(process.env.LOCALAPPDATA, 'npm-cache/_npx');
  for (const entry of fs.readdirSync(cache)) {
    const candidate = path.join(cache, entry, 'node_modules/@playwright/cli/playwright-cli.js');
    if (fs.existsSync(candidate)) { cli = candidate; break; }
  }
}
if (!cli) throw Error('Install @playwright/cli or set F12_PLAYWRIGHT_CLI');
const suffix = engine + (volume ? '-volume' : '');
const session = '-s=f12-human-' + suffix;
const run = args => spawnSync(process.execPath, [cli, session, ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 45000 });
const open = run(['open', 'http://localhost:3068', '--browser', engine === 'chromium' ? 'chrome' : 'firefox', '--headed', '--profile', path.join(privateDir, 'human-' + suffix + '-profile')]);
fs.writeFileSync(path.join(privateDir, 'human-' + suffix + '-open.log'), (open.stdout || '') + (open.stderr || ''));
const fixtures = JSON.parse(fs.readFileSync(path.join(privateDir, 'fixtures.json'), 'utf8'));
const settings = { account: fixtures.accounts[volume ? 'volume' : 'human'], pageId: volume ? fixtures.volume.ids[990] : fixtures.fixtures.human.source, title: volume ? 'F12 Estudo 0990' : 'F12 human 00' };
const filename = path.join(privateDir, 'human-' + suffix + '-setup.js');
fs.writeFileSync(filename, `async (page) => {
  const settings = ${JSON.stringify(settings)};
  await page.goto('http://localhost:3068');
  const auth = await page.request.post('http://localhost:3067/auth/login', { data: { email: settings.account.email, password: settings.account.password } });
  if (!auth.ok()) throw Error('Guided fixture login ' + auth.status());
  const tokens = await auth.json();
  await page.evaluate(tokens => { localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken); }, tokens);
  await page.goto('http://localhost:3068/?page=' + settings.pageId);
  await page.getByRole('textbox', { name: 'Conteúdo da página', exact: true }).waitFor();
  return { passed: true, title: settings.title, url: page.url(), browserVersion: page.context().browser().version() };
}`);
const result = run(['run-code', '--filename', filename, '--raw']);
fs.writeFileSync(path.join(privateDir, 'human-' + suffix + '-setup.log'), (result.stdout || '') + (result.stderr || ''));
let data;
try { data = JSON.parse(result.stdout); } catch { throw Error('Guided setup failed; inspect private log'); }
if (result.status !== 0 || !data.passed) throw Error('Guided setup did not pass');
fs.writeFileSync(path.join(publicDir, 'F12-human-' + suffix + '-setup-resultados.json'), JSON.stringify({ preparedAt: new Date().toISOString(), engine, ...data, acceptance: 'pending-human' }, null, 2) + '\n');
console.log(JSON.stringify(data));
