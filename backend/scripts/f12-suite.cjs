// Sequential batches: no server restarts while a browser scenario is running.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, publicDir } = require('./f12-environment.cjs');
const [engine, group] = process.argv.slice(2);
if (!['chromium', 'firefox'].includes(engine) || !['core', 'core-finish', 'f9', 'f10', 'f11'].includes(group)) throw Error('Use chromium|firefox core|core-finish|f9|f10|f11');
const steps = [];
const record = () => fs.writeFileSync(path.join(publicDir, `F12-${engine}-suite-${group}-resultados.json`), JSON.stringify({ verifiedAt: new Date().toISOString(), engine, group, passed: steps.every(step => step.passed), steps }, null, 2) + '\n');
function run(script, args) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [path.join(__dirname, script), ...args], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const step = { command: script + ' ' + args.join(' '), passed: result.status === 0 && !result.error, seconds: (Date.now() - started) / 1000 };
  steps.push(step); record(); console.log(JSON.stringify(step));
  if (!step.passed) { console.error((result.stdout || '').slice(-2500)); throw Error('F12 batch stopped at ' + step.command); }
}
function scenario(name, restart = true) {
  if (restart) run('f12.cjs', ['restart-api']);
  run('f12-browser.cjs', [engine, name]);
}
try {
  if (group === 'core-finish') {
    scenario('trash'); scenario('recovery-before');
    for (const name of ['force-close', 'open', 'recovery-after']) scenario(name, false);
  } else if (group === 'f9') {
    for (const name of ['navigation', 'presentation', 'icon']) scenario('replay-f9-' + name);
  } else if (group === 'f10') {
    for (const name of ['setup', 'browser', 'operations', 'portability']) scenario('replay-f10-' + name);
  } else if (group === 'f11') {
    for (const name of ['setup', 'collections', 'models']) scenario('replay-f11-' + name);
  } else {
    run('f12.cjs', ['fresh-browser', engine]);
    for (const name of ['authenticate', 'journey', 'compatibility', 'surfaces', 'accessibility', 'clipboard', 'native-paste-before']) scenario(name);
    scenario('native-paste-after', false);
    for (const name of ['integrity', 'trash', 'recovery-before']) scenario(name);
    for (const name of ['force-close', 'open', 'recovery-after']) scenario(name, false);
  }
  record();
} catch (error) { record(); console.error(error.message); process.exitCode = 1; }
