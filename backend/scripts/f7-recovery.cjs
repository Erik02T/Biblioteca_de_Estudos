// Rehearsal for synthetic fixtures; SQL dump/restore is performed separately.
const { PrismaClient } = require('@prisma/client');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const directory = path.resolve(__dirname, '../../.f7-artifacts/recovery');
const database = process.env.F7_TEST_DATABASE;
const bucket = process.env.F7_TEST_BUCKET;
if (!/^biblioteca_test_[a-z0-9_]+$/.test(database || '') || !/^biblioteca-test-f7[a-z0-9-]*$/.test(bucket || '')) throw Error('Explicit isolated database and bucket required');
const prisma = new PrismaClient({ datasources: { db: { url: `postgresql://biblioteca:biblioteca@localhost:5433/${database}` } } });
const s3 = new S3Client({ endpoint: 'http://localhost:9000', region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: 'biblioteca_storage', secretAccessKey: 'biblioteca_storage_dev_2026' } });
const read = async (bucket, key) => Buffer.from(await (await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).Body.transformToByteArray());
async function databaseState() {
  const tables = {};
  for (const model of ['user', 'area', 'attachment', 'pageRevision', 'revisionFile', 'template', 'viewConfiguration']) {
    const rows = await prisma[model].findMany({ orderBy: { id: 'asc' } });
    tables[model] = { count: rows.length, sha256: hash(JSON.stringify(rows)) };
  }
  return tables;
}
async function main() {
  if (process.argv[2] === 'backup') {
    await fs.mkdir(path.join(directory, 'objects'), { recursive: true });
    const files = [];
    let token;
    do {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
      for (const item of list.Contents || []) {
        const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: item.Key }));
        const bytes = Buffer.from(await object.Body.transformToByteArray());
        const filename = hash(item.Key);
        await fs.writeFile(path.join(directory, 'objects', filename), bytes);
        files.push({ key: item.Key, filename, sha256: hash(bytes), size: bytes.length, contentType: object.ContentType, contentDisposition: object.ContentDisposition });
      }
      token = list.NextContinuationToken;
    } while (token);
    const tables = await databaseState();
    await fs.writeFile(path.join(directory, 'inventory.json'), JSON.stringify({ sourceDatabase: database, sourceBucket: bucket, tables, files }, null, 2));
    console.log(JSON.stringify({ action: 'backup', tables, objects: files.length }));
  } else if (process.argv[2] === 'restore') {
    const inventory = JSON.parse(await fs.readFile(path.join(directory, 'inventory.json'), 'utf8'));
    if (database === inventory.sourceDatabase || bucket === inventory.sourceBucket) throw Error('Restore requires separate targets');
    const tables = await databaseState();
    if (JSON.stringify(tables) !== JSON.stringify(inventory.tables)) throw Error('Restored database differs: IDs/content/relationships not preserved');
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    const existing = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
    if (existing.Contents?.length) throw Error('Refusing to overwrite a populated restore bucket');
    for (const file of inventory.files) {
      const bytes = await fs.readFile(path.join(directory, 'objects', file.filename));
      if (hash(bytes) !== file.sha256) throw Error('Backup object hash mismatch');
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: file.key, Body: bytes, ContentType: file.contentType, ContentDisposition: file.contentDisposition }));
      if (hash(await read(bucket, file.key)) !== file.sha256) throw Error('Restored object hash mismatch');
    }
    console.log(JSON.stringify({ action: 'restore', tables, objects: inventory.files.length, result: 'PASS' }));
  } else throw Error('Use backup or restore');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); s3.destroy(); });
