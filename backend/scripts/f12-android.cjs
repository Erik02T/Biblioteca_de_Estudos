// USB-only fixture access. Uses a separate adb server; never installs an APK.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { root, privateDir, publicDir } = require('./f12-environment.cjs');
const adb = path.join(privateDir, 'android/platform-tools/adb.exe');
if (!fs.existsSync(adb)) throw Error('Extract the official Android platform-tools into .f12-artifacts/android first');
const directory = path.join(privateDir, 'android-user'); fs.mkdirSync(directory, { recursive: true });
const env = { ...process.env, ANDROID_USER_HOME: directory };
const execute = args => {
  const result = spawnSync(adb, ['-P', '5038', ...args], { env, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw Error('adb command failed; inspect the device connection');
  return result.stdout.trim();
};
const mode = process.argv[2] || 'inspect';
const output = execute(['devices', '-l']);
fs.writeFileSync(path.join(privateDir, 'android-devices.log'), output);
const devices = output.split(/\r?\n/).flatMap(line => {
  const match = line.match(/^(\S+)\s+(device|unauthorized|offline)\b(.*)$/);
  return match ? [{ serial: match[1], status: match[2], model: match[3].match(/model:(\S+)/)?.[1] }] : [];
});
const publicDevices = devices.map(({ serial, ...device }) => ({ ...device, id: createHash('sha256').update(serial).digest('hex').slice(0, 8) }));
if (mode === 'inspect') { console.log(JSON.stringify({ adbServerPort: 5038, devices: publicDevices })); process.exit(0); }
if (mode === 'disconnect' && devices.length === 0) {
  execute(['kill-server']);
  console.log('Android already disconnected; stopped only the F12 adb server on 5038.');
  process.exit(0);
}
const serial = process.env.F12_ANDROID_SERIAL || (devices.length === 1 ? devices[0].serial : undefined);
const device = devices.find(item => item.serial === serial && item.status === 'device');
if (!device) throw Error('Exactly one authorized Android is required, or set F12_ANDROID_SERIAL explicitly');
if (mode === 'disconnect') {
  const reverse = execute(['-s', serial, 'reverse', '--list']);
  for (const port of [3067, 3068, 9000]) if (reverse.split(/\s+/).includes('tcp:' + port)) execute(['-s', serial, 'reverse', '--remove', 'tcp:' + port]);
  const forwards = execute(['forward', '--list']).split(/\r?\n/).map(line => line.trim().split(/\s+/));
  if (forwards.some(item => item[0] === serial && item[1] === 'tcp:9223' && item[2] === 'localabstract:chrome_devtools_remote')) execute(['-s', serial, 'forward', '--remove', 'tcp:9223']);
  console.log('Removed only the F12 port mappings; device and other adb servers remain available.');
  process.exit(0);
}
if (mode !== 'connect') throw Error('Use inspect | connect | disconnect');
for (const port of [3067, 3068, 9000]) execute(['-s', serial, 'reverse', 'tcp:' + port, 'tcp:' + port]);
const fixtures = JSON.parse(fs.readFileSync(path.join(privateDir, 'fixtures.json'), 'utf8'));
const url = 'http://localhost:3068/?page=' + fixtures.fixtures.human.source;
execute(['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, 'com.android.chrome']);
execute(['-s', serial, 'forward', 'tcp:9223', 'localabstract:chrome_devtools_remote']);
// Chrome can take a few seconds to publish its socket after a cold start.
// The setup itself remains synchronous; retry readiness before invoking the CLI.
const readiness = spawnSync(process.execPath, ['-e', `(async()=>{ for(let i=0;i<30;i++){ try{ const r=await fetch('http://localhost:9223/json/version'); if(r.ok && (await r.json()).webSocketDebuggerUrl) return; }catch{} await new Promise(r=>setTimeout(r,200)); } process.exitCode=1; })()`], { windowsHide: true });
if (readiness.status !== 0) throw Error('Chrome USB debugging did not become ready; keep the F12 tab open');
let cli = process.env.F12_PLAYWRIGHT_CLI;
if (!cli) {
  const cache = path.join(process.env.LOCALAPPDATA, 'npm-cache/_npx');
  for (const entry of fs.readdirSync(cache)) {
    const candidate = path.join(cache, entry, 'node_modules/@playwright/cli/playwright-cli.js');
    if (fs.existsSync(candidate)) { cli = candidate; break; }
  }
}
if (!cli) throw Error('Set F12_PLAYWRIGHT_CLI');
const run = args => spawnSync(process.execPath, [cli, '-s=f12-android', ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 45000 });
const attached = run(['attach', '--cdp', 'http://localhost:9223']);
fs.writeFileSync(path.join(privateDir, 'android-attach.log'), (attached.stdout || '') + (attached.stderr || ''));
if (attached.status !== 0) throw Error('Chrome USB debugging not ready. Keep Chrome open on the F12 page and authorize the computer.');
const filename = path.join(privateDir, 'android-setup.js');
fs.writeFileSync(filename, `async (page) => {
  const target = page.context().pages().find(item => item.url().startsWith('http://localhost:3068'));
  if (!target) throw Error('The F12 tab is not open on Android');
  const account = ${JSON.stringify(fixtures.accounts.human)};
  const response = await target.request.post('http://localhost:3067/auth/login', { data: { email: account.email, password: account.password } });
  if (!response.ok()) throw Error('Android fixture login ' + response.status());
  const tokens = await response.json();
  await target.evaluate(tokens => { localStorage.setItem('biblioteca-access-token', tokens.accessToken); localStorage.setItem('biblioteca-refresh-token', tokens.refreshToken); }, tokens);
  await target.reload(); await target.getByRole('textbox', { name: 'Conteúdo da página', exact: true }).waitFor();
  return { passed: true, browserVersion: target.context().browser().version(), url: target.url(), viewport: await target.evaluate(() => ({ width: innerWidth, height: innerHeight, touchPoints: navigator.maxTouchPoints })) };
}`);
const result = run(['run-code', '--filename', filename, '--raw']);
fs.writeFileSync(path.join(privateDir, 'android-setup.log'), (result.stdout || '') + (result.stderr || ''));
let data;
try { data = JSON.parse(result.stdout); } catch { throw Error('Android setup did not return a result; inspect private log'); }
if (!data.passed) throw Error('Android setup failed');
const report = { preparedAt: new Date().toISOString(), ...data, androidVersion: execute(['-s', serial, 'shell', 'getprop', 'ro.build.version.release']), device: publicDevices.find(item => item.id === createHash('sha256').update(serial).digest('hex').slice(0, 8)), physicalAcceptance: 'pending-human', usbOnly: true };
fs.writeFileSync(path.join(publicDir, 'F12-android-setup-resultados.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
