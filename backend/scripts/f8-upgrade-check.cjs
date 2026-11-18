// Restore existing F7 fixtures into a NEW F8 database; never changes the source.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = 'biblioteca_test_f7_restore_final';
const target = 'biblioteca_test_f8_upgrade_20261116';
const container = 'biblioteca_de_estudos-postgres-1';
const output = path.resolve(__dirname, '../../.f8-artifacts');
fs.mkdirSync(output, { recursive: true });
function docker(args, input) {
  const result = spawnSync('docker', ['exec', ...(input ? ['-i'] : []), container, ...args], { input, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw Error('Fixture command failed: ' + result.stderr?.toString());
  return result.stdout;
}
const sql = (database, query) => docker(['psql', '-U', 'biblioteca', '-d', database, '-At', '-v', 'ON_ERROR_STOP=1', '-c', query]).toString().trim();
function inventory() {
  return Object.fromEntries(['User', 'Session', 'Area', 'Attachment', 'ViewConfiguration', 'Template', 'PageRevision', 'RevisionFile'].map(table => {
    const result = sql(target, `SELECT count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text,'[]')) FROM "${table}" t`);
    const [count, hash] = result.split(':'); return [table, { count: Number(count), hash }];
  }));
}
const sourceMigrations = Number(sql(source, 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'));
assert.equal(sourceMigrations, 11, 'Requires F7 fixtures before the additive F8 migration');
assert.equal(sql('postgres', `SELECT count(*) FROM pg_database WHERE datname='${target}'`), '0', 'Refuse to overwrite an existing target');
const dump = docker(['pg_dump', '-U', 'biblioteca', '-d', source, '-Fc']);
fs.writeFileSync(path.join(output, 'f7-before-f8.dump'), dump);
sql('postgres', `CREATE DATABASE ${target}`);
docker(['pg_restore', '-U', 'biblioteca', '-d', target, '--exit-on-error', '--no-owner'], dump);
const before = inventory();
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
  cwd: path.resolve(__dirname, '..'), env: { ...process.env, DATABASE_URL: `postgresql://biblioteca:biblioteca@localhost:5433/${target}` }, encoding: 'utf8',
});
if (result.status !== 0) throw Error('Clone migration failed');
const after = inventory(); assert.deepEqual(after, before);
const migrations = Number(sql(target, 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'));
assert.equal(migrations, 12);
const report = { source, target, sourceMigrations, migrations, restored: true, unchanged: true, before, after };
fs.writeFileSync(path.join(output, 'upgrade.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
