const { spawnSync, spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { database, bucket, env } = require('./f8-environment.cjs');
const cwd = path.join(__dirname, '..');
const mode = process.argv[2] || 'test';
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
if (mode === 'prepare') {
  // Names are restricted above; no SQL value may contain quoting or separators.
  const exists = spawnSync('docker', ['exec', 'biblioteca_de_estudos-postgres-1', 'psql', '-U', 'biblioteca', '-d', 'postgres', '-Atc', `SELECT 1 FROM pg_database WHERE datname='${database}'`], { encoding: 'utf8' });
  if (exists.status !== 0) throw Error('Cannot inspect local fixture database');
  if (!exists.stdout.trim()) run('docker', ['exec', 'biblioteca_de_estudos-postgres-1', 'psql', '-U', 'biblioteca', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${database}`]);
  run(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy']);
  console.log(JSON.stringify({ database, bucket, prepared: true }));
} else if (mode === 'serve') {
  // A separate process/port, never the user's API on 3000.
  const directory = path.resolve(cwd, '../.f8-artifacts'); fs.mkdirSync(directory, { recursive: true });
  const child = spawn(process.execPath, ['dist/src/main.js'], { cwd, env, windowsHide: true, stdio: ['ignore', fs.openSync(path.join(directory, 'api-out.log'), 'a'), fs.openSync(path.join(directory, 'api-err.log'), 'a')] });
  child.on('exit', code => process.exit(code ?? 1));
  console.log(JSON.stringify({ database, bucket, port: env.PORT, pid: child.pid }));
} else if (mode === 'test') {
  // Bootstrap integration executes the real compiled entrypoint, including CORS
  // and authorization before body parsing. Never test an absent/stale build.
  run(process.execPath, [require.resolve('@nestjs/cli/bin/nest.js'), 'build']);
  run(process.execPath, [require.resolve('jest/bin/jest'), '--runInBand', ...process.argv.slice(3)]);
} else throw Error('Use prepare, serve or test');
