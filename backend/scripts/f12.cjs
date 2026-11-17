// Reproducible local acceptance commands. All mutations target F12 fixtures.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync, execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const config = require('./f12-environment.cjs');
const { root, privateDir, publicDir, database, bucket, env, webEnv } = config;
const backend = path.join(root, 'backend'), frontend = path.join(root, 'frontend');
const mode = process.argv[2];
const report = (name, data) => fs.writeFileSync(path.join(publicDir, `F12-${name}.json`), JSON.stringify(data, null, 2) + '\n');
const run = (args, cwd = backend, variables = env) => {
  const result = spawnSync(process.execPath, args, { cwd, env: variables, windowsHide: true, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw Error('Command failed: ' + args[0] + ' (' + (result.error?.message || result.status) + ')');
};
const resolve = (cwd, module) => require.resolve(module, { paths: [cwd] });
async function main() {
  if (mode === 'prepare') {
    run(['scripts/run-f8.cjs', 'prepare']);
    await require('./f12-fixtures.cjs').seed(config);
  } else if (mode === 'seed') {
    await require('./f12-fixtures.cjs').seed(config);
  } else if (mode === 'fresh-browser') {
    await require('./f12-fixtures.cjs').freshBrowser(config, process.argv[3]);
  } else if (mode === 'api') {
    Object.assign(process.env, env);
    fs.writeFileSync(path.join(privateDir, 'api-process.json'), JSON.stringify({ pid: process.pid, entrypoint: __filename }));
    require('../dist/src/main.js');
  } else if (mode === 'start-api' || mode === 'restart-api') {
    const recordPath = path.join(privateDir, 'api-process.json');
    if (mode === 'restart-api' && fs.existsSync(recordPath)) {
      const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
      if (!Number.isSafeInteger(record.pid) || record.entrypoint !== __filename) throw Error('Invalid F12 process record');
      const info = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Get-CimInstance Win32_Process -Filter 'ProcessId=${record.pid}' | Select-Object CommandLine | ConvertTo-Json -Compress`], { encoding: 'utf8', windowsHide: true });
      if (info.status !== 0) throw Error('Cannot verify F12 process identity');
      if (info.stdout.trim()) {
        const command = JSON.parse(info.stdout).CommandLine;
        if (!command?.includes(__filename) || !/\bapi\s*$/.test(command)) throw Error('Refusing to stop a process outside this F12 launcher');
        process.kill(record.pid);
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    }
    let occupied = false;
    try { await fetch('http://localhost:3067/health', { signal: AbortSignal.timeout(1000) }); occupied = true; } catch { /* unavailable */ }
    if (occupied) throw Error('Port 3067 is already serving; identify its owner instead of starting another API');
    const child = spawn(process.execPath, [__filename, 'api'], { cwd: root, env, detached: true, windowsHide: true, stdio: ['ignore', fs.openSync(path.join(privateDir, 'api-out.log'), 'a'), fs.openSync(path.join(privateDir, 'api-err.log'), 'a')] });
    child.unref();
    for (let attempt = 0; attempt < 40; attempt++) {
      if (child.exitCode !== null) throw Error('F12 API exited during startup; inspect private logs');
      try { const response = await fetch('http://localhost:3067/health/ready'); if (response.ok && JSON.parse(fs.readFileSync(recordPath, 'utf8')).pid === child.pid) { console.log(JSON.stringify({ role: 'F12 fixture API', pid: child.pid, ready: true, limitsUnchanged: true })); return; } } catch { /* starting */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw Error('F12 API did not become ready; inspect private logs');
  } else if (mode === 'web') {
    run([resolve(frontend, 'next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3068'], frontend, webEnv);
  } else if (mode === 'checks') {
    const checks = [
      ['backend-tests', backend, ['scripts/run-f8.cjs', 'test'], env],
      ['backend-http-mocked', backend, [resolve(backend, 'jest/bin/jest'), '--config', 'test/jest-e2e.json', '--runInBand'], env],
      ['backend-lint', backend, [path.join(backend, 'node_modules/eslint/bin/eslint.js'), 'src/**/*.ts', 'test/**/*.ts'], env],
      ['frontend-tests', frontend, [resolve(frontend, 'jest/bin/jest'), '--runInBand'], env],
      ['frontend-lint', frontend, [path.join(frontend, 'node_modules/eslint/bin/eslint.js')], env],
      ['frontend-build', frontend, [resolve(frontend, 'next/dist/bin/next'), 'build'], webEnv],
    ];
    const selected = process.argv.slice(3);
    if (selected.some(name => !checks.some(([id]) => id === name))) throw Error('Unknown check');
    const results = [];
    for (const [name, cwd, args, variables] of checks) {
      if (selected.length && !selected.includes(name)) continue;
      const start = Date.now();
      const result = spawnSync(process.execPath, args, { cwd, env: variables, encoding: 'utf8', maxBuffer: 48 * 1024 * 1024, windowsHide: true });
      const output = (result.stdout || '') + (result.stderr || '');
      fs.writeFileSync(path.join(privateDir, name + '.log'), output);
      const entry = { name, passed: !result.error && result.status === 0, seconds: (Date.now() - start) / 1000, verifiedAt: new Date().toISOString(), summary: output.split(/\r?\n/).filter(line => /^(Test Suites:|Tests:|Snapshots:|Time:)/.test(line)) };
      results.push(entry); console.log(JSON.stringify(entry));
      report('checks-' + name, entry);
      if (!entry.passed) console.error(output.slice(-5000));
    }
    report('checks-resultados', { verifiedAt: new Date().toISOString(), results, partialSelection: selected.length > 0 });
    if (results.some(entry => !entry.passed)) process.exitCode = 1;
  } else if (mode === 'recovery') {
    await require('./f12-recovery.cjs').recover(config);
  } else if (mode === 'reference') {
    const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
    // Include tracked and untracked source, not private data/builds or old artifacts.
    const files = git(['ls-files', '-co', '--exclude-standard']).split(/\r?\n/).filter(file => /^(backend\/(src|scripts|prisma)\/|frontend\/src\/|docs\/notion\/execucao\/F12|docs\/notion\/Analise_Pos_F7_Proximos_Passos_Biblioteca.md$|docs\/README.md$|output\/playwright\/F12|frontend\/(package.*json|next.config.ts|AGENTS.md|tsconfig.json|eslint.config.mjs|jest.setup.mjs|README.md)$|backend\/(package.*json|tsconfig.*json|nest-cli.json|eslint.config.mjs|README.md)$|\.gitignore$|README.md$|docker-compose.yml$)/.test(file) && !file.endsWith('F12-codigo.json'));
    report('codigo', { createdAt: new Date().toISOString(), head: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']), node: process.version, platform: os.platform(), release: os.release(), cpu: os.cpus()[0]?.model, memoryGiB: Math.round(os.totalmem() / 1024 ** 3), database, bucket, files: Object.fromEntries([...new Set(files)].sort().filter(file => fs.existsSync(path.join(root, file))).map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])) });
    console.log('F12 source reference written (no secrets or personal documents).');
  } else throw Error('Use prepare | seed | checks [check names] | api | start-api | restart-api | web | recovery | reference');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
