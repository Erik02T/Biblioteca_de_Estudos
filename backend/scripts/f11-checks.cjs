// Repeatable final checks. Logs stay private; the public artifact contains only results.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const logs = path.join(root, '.f8-artifacts/f11-checks');
fs.mkdirSync(logs, { recursive: true });
const results = [];
const run = (name, cwd, args, env = process.env) => {
  const started = Date.now();
  const result = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  const output = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(logs, name + '.log'), output);
  const entry = { name, passed: result.status === 0 && !result.error, seconds: Math.round((Date.now() - started) / 100) / 10,
    summary: output.split(/\r?\n/).filter(line => /^(Test Suites:|Tests:|Snapshots:|Time:)/.test(line)),
  };
  results.push(entry); console.log(JSON.stringify(entry));
  if (!entry.passed) {
    console.log(output.slice(-6000));
    if (result.error) console.error(result.error.message);
  }
};
const resolve = (cwd, name) => name === 'eslint/bin/eslint.js'
  ? path.join(cwd, 'node_modules/eslint/bin/eslint.js')
  : require.resolve(name, { paths: [cwd] });
if (process.argv.includes('--remaining')) {
  // Continue after an interrupted runner without repeating the already completed suites.
  for (const name of ['backend-tests', 'backend-http-mocked']) {
    const output = fs.readFileSync(path.join(logs, name + '.log'), 'utf8');
    if (!/Test Suites:.*passed/.test(output) || /Test Suites:.*failed/.test(output)) throw Error('No successful completed log for ' + name);
    const entry = { name, passed: true, fromCompletedLog: true, summary: output.split(/\r?\n/).filter(line => /^(Test Suites:|Tests:|Snapshots:|Time:)/.test(line)) };
    results.push(entry); console.log(JSON.stringify(entry));
  }
} else {
  run('backend-tests', backend, ['scripts/run-f8.cjs', 'test']);
  run('backend-http-mocked', backend, [resolve(backend, 'jest/bin/jest'), '--config', 'test/jest-e2e.json', '--runInBand'], { ...process.env, NODE_ENV: 'test' });
}
run('backend-lint', backend, [resolve(backend, 'eslint/bin/eslint.js'), 'src/**/*.ts', 'test/**/*.ts']);
run('frontend-build', frontend, [resolve(frontend, 'next/dist/bin/next'), 'build'], { ...process.env, NODE_ENV: 'production', NEXT_DIST_DIR: '.next-f11', ALLOW_LOOPBACK_IN_BUILD: 'true', NEXT_PUBLIC_API_URL: 'http://localhost:3057', NEXT_PUBLIC_STORAGE_URL: 'http://localhost:9000/biblioteca-test-f7-f8-20261116' });
run('frontend-tests', frontend, [resolve(frontend, 'jest/bin/jest'), '--runInBand'], { ...process.env, NODE_ENV: 'test' });
run('frontend-lint', frontend, [resolve(frontend, 'eslint/bin/eslint.js')]);
const report = { verifiedAt: new Date().toISOString(), results };
fs.writeFileSync(path.join(root, 'output/playwright/F11-checks-resultados.json'), JSON.stringify(report, null, 2) + '\n');
if (results.some(result => !result.passed)) process.exitCode = 1;
