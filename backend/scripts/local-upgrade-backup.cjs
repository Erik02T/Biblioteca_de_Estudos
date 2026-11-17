// Backup/recovery for the explicitly identified local development library only.
// Database dump/restore is performed separately with pg_dump/pg_restore.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const env = dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true }).parsed;
const source = new URL(env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(source.hostname) || source.port !== '5433' || source.pathname !== '/biblioteca_estudos' || !/^http:\/\/(localhost|127\.0\.0\.1):9000$/.test(env.STORAGE_ENDPOINT)) throw Error('Refusing an unidentified or non-local source');
const run = process.env.LOCAL_UPGRADE_RUN;
if (!/^\d{8}_\d{6}$/.test(run || '')) throw Error('Set LOCAL_UPGRADE_RUN=YYYYMMDD_HHMMSS');
const directory = path.resolve(__dirname, '../../.f7-artifacts/local-upgrade-' + run);
const cloneDatabase = `biblioteca_test_f7_upgrade_${run}`;
const cloneBucket = `biblioteca-test-f7-upgrade-${run.replace('_', '-')}`;
const mode = process.argv[2];
if (!['backup', 'restore', 'verify-clone', 'verify-source', 'migrate-source'].includes(mode)) throw Error('Invalid mode');
const databaseUrl = new URL(source);
if (mode === 'restore' || mode === 'verify-clone') databaseUrl.pathname = '/' + cloneDatabase;
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
const s3 = new S3Client({ endpoint: env.STORAGE_ENDPOINT, region: env.STORAGE_REGION || 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY } });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function tables() {
  const result = {};
  for (const table of ['User', 'Session', 'Area', 'Attachment', 'Template', 'ViewConfiguration']) {
    // Fixed identifiers; output contains only counts and digests, never note content.
    const rows = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(COALESCE(string_agg((to_jsonb(t)-'deletionBatchId')::text, '' ORDER BY t.id), '')) AS hash FROM "${table}" t`);
    result[table] = rows[0];
  }
  return result;
}
async function main() {
  if (mode === 'backup') {
    await fs.mkdir(path.join(directory, 'objects'), { recursive: true });
    const files = [];
    const before = await tables();
    let token;
    do {
      const listed = await s3.send(new ListObjectsV2Command({ Bucket: env.STORAGE_BUCKET, ContinuationToken: token }));
      for (const file of listed.Contents || []) {
        const object = await s3.send(new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: file.Key }));
        const bytes = Buffer.from(await object.Body.transformToByteArray());
        const filename = hash(file.Key);
        await fs.writeFile(path.join(directory, 'objects', filename), bytes);
        files.push({ key: file.Key, filename, sha256: hash(bytes), size: bytes.length, contentType: object.ContentType, contentDisposition: object.ContentDisposition });
      }
      token = listed.NextContinuationToken;
    } while (token);
    if (JSON.stringify(before) !== JSON.stringify(await tables())) throw Error('Source changed during backup; do not migrate yet');
    await fs.writeFile(path.join(directory, 'inventory.json'), JSON.stringify({ tables: before, sourceBucket: env.STORAGE_BUCKET, files }, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ action: mode, directory, cloneDatabase, cloneBucket, tables: before, objects: files.length }));
    return;
  }
  const inventory = JSON.parse(await fs.readFile(path.join(directory, 'inventory.json'), 'utf8'));
  const actual = await tables();
  if (JSON.stringify(actual) !== JSON.stringify(inventory.tables)) throw Error('Table counts/digests differ; preserve backup and investigate before continuing');
  if (mode === 'migrate-source') {
    // Require an available SQL backup and a clone that was actually restored.
    await fs.access(path.join(directory, 'database.dump'));
    await fs.access(path.join(directory, 'restore-verified.json'));
    const { spawnSync } = require('node:child_process');
    const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.join(__dirname, '..'), stdio: 'inherit', env: { ...process.env, DATABASE_URL: source.toString() } });
    if (result.status !== 0) throw Error('Migration failed; preserve the backup and inspect the migration history');
  }
  if (mode === 'restore') {
    await s3.send(new CreateBucketCommand({ Bucket: cloneBucket }));
    const existing = await s3.send(new ListObjectsV2Command({ Bucket: cloneBucket, MaxKeys: 1 }));
    if (existing.Contents?.length) throw Error('Refusing to overwrite a populated restore bucket');
    for (const file of inventory.files) {
      const bytes = await fs.readFile(path.join(directory, 'objects', file.filename));
      if (hash(bytes) !== file.sha256) throw Error('Backup object digest mismatch');
      await s3.send(new PutObjectCommand({ Bucket: cloneBucket, Key: file.key, Body: bytes, ContentType: file.contentType, ContentDisposition: file.contentDisposition }));
      const recovered = await s3.send(new GetObjectCommand({ Bucket: cloneBucket, Key: file.key }));
      if (hash(Buffer.from(await recovered.Body.transformToByteArray())) !== file.sha256) throw Error('Restored object digest mismatch');
    }
    await fs.writeFile(path.join(directory, 'restore-verified.json'), JSON.stringify({ cloneDatabase, cloneBucket, verifiedAt: new Date().toISOString() }));
  }
  if (mode === 'verify-clone') {
    for (const file of inventory.files) {
      const object = await s3.send(new GetObjectCommand({ Bucket: cloneBucket, Key: file.key }));
      if (hash(Buffer.from(await object.Body.transformToByteArray())) !== file.sha256) throw Error('Restored object digest mismatch');
    }
    await fs.writeFile(path.join(directory, 'restore-verified.json'), JSON.stringify({ cloneDatabase, cloneBucket, verifiedAt: new Date().toISOString() }));
  }
  if (mode === 'verify-source') {
    // Reproduce the failed Prisma operation without printing personal content.
    await prisma.area.findMany({ take: 1 });
    await prisma.pageRevision.count();
    const owner = await prisma.area.findFirst({ select: { userId: true } });
    if (owner) {
      const { AreasService } = require('../dist/src/areas/areas.service');
      const { StorageService } = require('../dist/src/storage/storage.service');
      await new AreasService(prisma, new StorageService()).findAll(owner.userId, undefined, undefined, 1, 20);
    }
    const column = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Area' AND column_name='deletionBatchId'`;
    if (column.length !== 1) throw Error('Missing deletionBatchId');
  }
  console.log(JSON.stringify({ action: mode, result: 'PASS', areaListing: mode === 'verify-source' ? 'PASS' : undefined, tables: actual, objects: inventory.files.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); s3.destroy(); });
