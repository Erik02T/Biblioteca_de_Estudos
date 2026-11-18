const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function recover({ env, database, bucket, privateDir, publicDir }) {
  const run = new Date().toISOString().replace(/\D/g, '').slice(0, 17);
  const directory = path.join(privateDir, 'recovery-' + run);
  fs.mkdirSync(directory, { recursive: false });
  const targetDatabase = 'biblioteca_test_f12_restore_' + run;
  const targetBucket = 'biblioteca-test-f12-restore-' + run;
  if (!/^biblioteca_test_f8_f12_\d+$/.test(database) || !/^biblioteca-test-f7-f8-f12-\d+$/.test(bucket)) throw Error('Exclusive F12 resources required');
  const source = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  const targetUrl = new URL(env.DATABASE_URL); targetUrl.pathname = '/' + targetDatabase;
  const target = new PrismaClient({ datasources: { db: { url: targetUrl.toString() } } });
  const s3 = new S3Client({ endpoint: env.STORAGE_ENDPOINT, region: env.STORAGE_REGION, forcePathStyle: true, credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY } });
  const docker = (args, input) => {
    const result = spawnSync('docker', ['exec', ...(input ? ['-i'] : []), 'biblioteca_de_estudos-postgres-1', ...args], { input, maxBuffer: 256 * 1024 * 1024, windowsHide: true });
    if (result.error || result.status !== 0) throw Error('Recovery command failed: ' + (result.error?.message || result.stderr.toString()));
    return result.stdout;
  };
  const state = async client => {
    const tables = {};
    for (const table of ['User', 'Session', 'Area', 'Attachment', 'ViewConfiguration', 'Template', 'AreaOpening', 'TemplateFile', 'AreaCreationRequest', 'PageRevision', 'RevisionFile', '_prisma_migrations']) {
      const [digest] = await client.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(COALESCE(string_agg(value, '' ORDER BY value), '')) AS hash FROM (SELECT to_jsonb(t)::text AS value FROM "${table}" t) rows`);
      tables[table] = digest;
    }
    return tables;
  };
  const read = async (name, key) => {
    const object = await s3.send(new GetObjectCommand({ Bucket: name, Key: key }));
    return { bytes: Buffer.from(await object.Body.transformToByteArray()), contentType: object.ContentType, contentDisposition: object.ContentDisposition };
  };
  try {
    const before = await state(source);
    const dump = docker(['pg_dump', '-U', 'biblioteca', '-d', database, '-Fc']);
    fs.writeFileSync(path.join(directory, 'database.dump'), dump, { flag: 'wx' });
    fs.mkdirSync(path.join(directory, 'objects'));
    const files = []; let continuation;
    do {
      const batch = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuation }));
      for (const entry of batch.Contents || []) {
        const { bytes, ...metadata } = await read(bucket, entry.Key);
        const name = hash(entry.Key);
        fs.writeFileSync(path.join(directory, 'objects', name), bytes, { flag: 'wx' });
        files.push({ key: entry.Key, name, sha256: hash(bytes), size: bytes.length, ...metadata });
      }
      continuation = batch.NextContinuationToken;
    } while (continuation);
    if (JSON.stringify(before) !== JSON.stringify(await state(source))) throw Error('Source changed during backup; preserve this run and repeat');
    const inventory = { sourceDatabase: database, sourceBucket: bucket, targetDatabase, targetBucket, tables: before, dumpSha256: hash(dump), files };
    fs.writeFileSync(path.join(directory, 'inventory.json'), JSON.stringify(inventory, null, 2));
    docker(['psql', '-U', 'biblioteca', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${targetDatabase}`]);
    docker(['pg_restore', '-U', 'biblioteca', '-d', targetDatabase, '--exit-on-error', '--no-owner'], dump);
    if (JSON.stringify(before) !== JSON.stringify(await state(target))) throw Error('Restored database differs');
    await s3.send(new CreateBucketCommand({ Bucket: targetBucket }));
    for (const file of files) {
      const bytes = fs.readFileSync(path.join(directory, 'objects', file.name));
      if (hash(bytes) !== file.sha256) throw Error('Backup object differs');
      await s3.send(new PutObjectCommand({ Bucket: targetBucket, Key: file.key, Body: bytes, ContentType: file.contentType, ContentDisposition: file.contentDisposition }));
      if (hash((await read(targetBucket, file.key)).bytes) !== file.sha256) throw Error('Restored object differs');
    }
    // Preserve stored canonical URL prefixes, but sign/read against the restored bucket.
    Object.assign(process.env, env, { DATABASE_URL: targetUrl.toString(), STORAGE_BUCKET: targetBucket });
    const { StorageService } = require('../dist/src/storage/storage.service.js');
    const storage = new StorageService();
    const attachment = await target.attachment.findFirstOrThrow({ where: { tipo: 'IMAGEM' } });
    const key = storage.resolveStorageKeyFromUrl(attachment.url);
    const signed = await storage.signAttachmentUrl(attachment);
    if (!key || !new URL(signed.url).pathname.startsWith('/' + targetBucket + '/')) throw Error('Restored read still targets source storage');
    const response = await fetch(signed.url);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok || hash(bytes) !== files.find(file => file.key === key)?.sha256) throw Error('Restored signed media differs');
    const result = { verifiedAt: new Date().toISOString(), passed: true, database, bucket, targetDatabase, targetBucket, tables: before, objects: files.length, dumpSha256: hash(dump), databaseHashesEqual: true, objectHashesEqual: true, restoredSignedMediaRead: true, note: 'Canonical URL prefix retained; STORAGE_BUCKET selects restored objects. No habitual data accessed.' };
    fs.writeFileSync(path.join(publicDir, 'F12-recovery-resultados.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally { await source.$disconnect(); await target.$disconnect(); s3.destroy(); }
}
module.exports = { recover };
