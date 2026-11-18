// Read-only startup regression: no migrations, fixtures or application-data writes.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const backend = path.join(root, 'backend');
const { parse } = require(path.join(backend, 'node_modules/dotenv'));
const configured = parse(fs.readFileSync(path.join(backend, '.env')));
const stale = new URL(configured.DATABASE_URL);
stale.port = '5432';
const port = configured.PORT || '3000';
const results = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function verify(script) {
  const env = { ...process.env, DATABASE_URL: stale.href, NODE_ENV: 'development' };
  delete env.DOTENV_CONFIG_PATH;
  const child = spawn(process.execPath, [path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), 'run', script], {
    cwd: backend, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  child.on('error', error => { output += error.code; });
  const result = { script, inheritedPort: '5432', configuredPort: new URL(configured.DATABASE_URL).port, ready: false };
  try {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline && child.exitCode === null) {
      if (output.includes(`Aplicação iniciada na porta ${port}`)) {
        const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
        const health = await response.json();
        result.ready = response.ok && health.checks?.database === 'connected';
        result.health = health;
        break;
      }
      await pause(250);
    }
    result.localFileSelected = output.includes('Configuração local:');
    result.staleValueReplaced = output.includes('DATABASE_URL herdada do terminal substituída');
    result.prismaP1001 = output.includes('P1001');
    result.portInUse = output.includes('EADDRINUSE');
    assert.ok(result.ready, `${script}: API did not confirm database readiness`);
    assert.ok(result.localFileSelected && result.staleValueReplaced && !result.prismaP1001);
    console.log(JSON.stringify(result));
  } finally {
    // Only terminate the npm process tree spawned by this scenario.
    if (child.pid) {
      const cleanup = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      result.cleanupExitCode = cleanup.status;
      if (cleanup.status !== 0) {
        fs.writeFileSync(path.join(__dirname, 'limpeza-bloqueada.json'), JSON.stringify({ pid: child.pid, status: cleanup.status }));
        throw new Error('Sem permissão para encerrar a árvore do teste; não iniciar outro cenário até liberar a porta.');
      }
    }
    results.push(result);
    fs.writeFileSync(path.join(__dirname, 'depois.json'), JSON.stringify(results, null, 2));
    await pause(500);
  }
}

(async () => {
  await verify('start:dev');
  await verify('start:dev');
  await verify('start');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
