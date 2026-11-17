// Local F11 upgrade: backup, restore/verify an isolated clone, then apply explicitly.
// Never prints credentials or document contents. Private artifacts are gitignored.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const env = require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true }).parsed;
const source = new URL(env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(source.hostname) || source.port !== '5433' || source.pathname !== '/biblioteca_estudos' || !/^http:\/\/(localhost|127\.0\.0\.1):9000$/.test(env.STORAGE_ENDPOINT)) throw Error('Refusing an unidentified/nonlocal source');
const mode = process.argv[2];
if (!['prepare', 'apply'].includes(mode)) throw Error('Use prepare or apply');
const artifacts = path.resolve(__dirname, '../../.f8-artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const pointer = path.join(artifacts, 'f11-upgrade-latest');
const run = process.env.F11_UPGRADE_RUN || (mode === 'prepare' ? new Date().toISOString().replace(/\D/g, '').slice(0, 14) : fs.readFileSync(pointer, 'utf8').trim());
if (!/^\d{14}$/.test(run)) throw Error('Invalid upgrade identifier');
const directory = path.join(artifacts, 'f11-upgrade-' + run);
const cloneDatabase = 'biblioteca_test_f11_upgrade_' + run;
const cloneBucket = 'biblioteca-test-f11-upgrade-' + run;
const prisma = new PrismaClient({ datasources: { db: { url: source.toString() } } });
const s3 = new S3Client({ endpoint: env.STORAGE_ENDPOINT, region: env.STORAGE_REGION || 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY } });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const docker = (args, input) => {
  const result = spawnSync('docker', ['exec', ...(input ? ['-i'] : []), 'biblioteca_de_estudos-postgres-1', ...args], { input, maxBuffer: 256 * 1024 * 1024, windowsHide: true });
  if (result.error || result.status !== 0) throw Error('Database backup/restore failed: ' + (result.error?.message || result.stderr?.toString()));
  return result.stdout;
};
async function tables(client) {
  const result = {};
  for (const table of ['User', 'Session', 'Area', 'Attachment', 'Template', 'ViewConfiguration', 'AreaCreationRequest', 'PageRevision', 'RevisionFile']) {
    // Fixed identifiers. Ignore only the additive Template columns for before/after comparison.
    const row = table === 'Template' ? "(to_jsonb(t)-'metadata'-'deletedAt')::text" : 'to_jsonb(t)::text';
    const [digest] = await client.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(COALESCE(string_agg(value, '' ORDER BY value), '')) AS hash FROM (SELECT ${row} AS value FROM "${table}" t) rows`);
    result[table] = digest;
  }
  return result;
}
async function files(bucket) {
  const objects = [];
  let token;
  do {
    const batch = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    for (const file of batch.Contents || []) {
      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: file.Key }));
      const bytes = Buffer.from(await object.Body.transformToByteArray());
      objects.push({ key: file.Key, sha256: hash(bytes), size: bytes.length, contentType: object.ContentType, contentDisposition: object.ContentDisposition, bytes });
    }
    token = batch.NextContinuationToken;
  } while (token);
  return objects.sort((a, b) => a.key.localeCompare(b.key));
}
const manifest = objects => objects.map(({ bytes, ...file }) => file);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function migrate(url) {
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.join(__dirname, '..'), env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) throw Error('Migration failed; preserve the backup and inspect migration history');
}
async function main() {
  if (mode === 'prepare') {
    fs.mkdirSync(directory, { recursive: false });
    fs.mkdirSync(path.join(directory, 'objects'));
    const baseline = await tables(prisma);
    const objects = await files(env.STORAGE_BUCKET);
    const dump = docker(['pg_dump', '-U', 'biblioteca', '-d', 'biblioteca_estudos', '-Fc']);
    fs.writeFileSync(path.join(directory, 'database.dump'), dump, { flag: 'wx' });
    for (const file of objects) fs.writeFileSync(path.join(directory, 'objects', hash(file.key)), file.bytes, { flag: 'wx' });
    const inventory = { run, cloneDatabase, cloneBucket, sourceBucket: env.STORAGE_BUCKET, tables: baseline, files: manifest(objects), dumpSha256: hash(dump) };
    fs.writeFileSync(path.join(directory, 'inventory.json'), JSON.stringify(inventory, null, 2), { flag: 'wx' });
    if (!equal(baseline, await tables(prisma)) || !equal(inventory.files, manifest(await files(env.STORAGE_BUCKET)))) throw Error('Source changed during backup; do not apply');
    docker(['psql', '-U', 'biblioteca', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${cloneDatabase}`]);
    docker(['pg_restore', '-U', 'biblioteca', '-d', cloneDatabase, '--exit-on-error', '--no-owner'], dump);
    await s3.send(new CreateBucketCommand({ Bucket: cloneBucket }));
    for (const file of objects) await s3.send(new PutObjectCommand({ Bucket: cloneBucket, Key: file.key, Body: file.bytes, ContentType: file.contentType, ContentDisposition: file.contentDisposition }));
    const cloneUrl = new URL(source); cloneUrl.pathname = '/' + cloneDatabase;
    const clone = new PrismaClient({ datasources: { db: { url: cloneUrl.toString() } } });
    try {
      if (!equal(baseline, await tables(clone)) || !equal(inventory.files, manifest(await files(cloneBucket)))) throw Error('Restored data differs');
      migrate(cloneUrl.toString());
      if (!equal(baseline, await tables(clone)) || !equal(inventory.files, manifest(await files(cloneBucket)))) throw Error('Migration changed restored data');
      if (await clone.areaOpening.count() !== 0 || await clone.templateFile.count() !== 0) throw Error('Unexpected additive rows');
      fs.writeFileSync(path.join(directory, 'restore-verified.json'), JSON.stringify({ run, restored: true, migrationVerified: true, objects: objects.length }));
      fs.writeFileSync(pointer, run);
      console.log(JSON.stringify({ action: mode, result: 'PASS', run, cloneDatabase, cloneBucket, tables: baseline, objects: objects.length }));
    } finally { await clone.$disconnect(); }
  } else {
    const inventory = JSON.parse(fs.readFileSync(path.join(directory, 'inventory.json'), 'utf8'));
    const verified = JSON.parse(fs.readFileSync(path.join(directory, 'restore-verified.json'), 'utf8'));
    if (inventory.run !== run || !verified.migrationVerified || verified.run !== run || inventory.sourceBucket !== env.STORAGE_BUCKET) throw Error('No verified matching clone');
    if (hash(fs.readFileSync(path.join(directory, 'database.dump'))) !== inventory.dumpSha256) throw Error('Backup digest mismatch');
    if (!equal(inventory.tables, await tables(prisma)) || !equal(inventory.files, manifest(await files(env.STORAGE_BUCKET)))) throw Error('Source changed since backup; prepare a fresh clone');
    migrate(source.toString());
    if (!equal(inventory.tables, await tables(prisma)) || !equal(inventory.files, manifest(await files(env.STORAGE_BUCKET)))) throw Error('Preservation check failed; retain backup and inspect');
    const evidence = { action: mode, result: 'PASS', run, tables: inventory.tables, objects: inventory.files.length };
    fs.writeFileSync(path.join(directory, 'source-verified.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
