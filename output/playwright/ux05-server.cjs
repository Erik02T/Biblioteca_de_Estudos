// Local test database only. Never prints credentials or modifies a pre-existing database.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync, spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const artifact = process.env.UX_ARTIFACT_PREFIX || 'UX-05';
const { PrismaClient } = require(path.join(root, 'backend/node_modules/@prisma/client'));
const { parse } = require(path.join(root, 'backend/node_modules/dotenv'));
(async () => {
  const local = parse(fs.readFileSync(path.join(root, 'backend/.env')));
  const database = new URL(local.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.port !== '5433') throw Error('Expected local PostgreSQL on 5433');
  database.pathname = '/postgres';
  const admin = new PrismaClient({ datasources: { db: { url: database.href } } });
  try {
    const existing = await admin.$queryRaw`SELECT datname FROM pg_database WHERE datname = 'biblioteca_test_ux05_20261115'`;
    if (!existing.length) await admin.$executeRawUnsafe('CREATE DATABASE biblioteca_test_ux05_20261115');
  } finally { await admin.$disconnect(); }
  database.pathname = '/biblioteca_test_ux05_20261115';
  const env = { ...process.env, NODE_ENV: 'test', DOTENV_CONFIG_PATH: 'NUL', DATABASE_URL: database.href, JWT_SECRET: crypto.randomBytes(48).toString('hex'), PORT: '3033', FRONTEND_URL: 'http://localhost:3001' };
  let storage = 'BLOQUEADO';
  if (local.STORAGE_ENDPOINT && ['localhost', '127.0.0.1'].includes(new URL(local.STORAGE_ENDPOINT).hostname)) {
    const { S3Client, CreateBucketCommand } = require(path.join(root, 'backend/node_modules/@aws-sdk/client-s3'));
    const bucket = 'ux05-' + crypto.randomUUID();
    const client = new S3Client({ endpoint: local.STORAGE_ENDPOINT, region: local.STORAGE_REGION || 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: local.STORAGE_ACCESS_KEY_ID, secretAccessKey: local.STORAGE_SECRET_ACCESS_KEY } });
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      for (const key of Object.keys(local).filter(key => key.startsWith('STORAGE_'))) env[key] = local[key];
      Object.assign(env, { STORAGE_BUCKET: bucket, STORAGE_PUBLIC_URL: local.STORAGE_ENDPOINT.replace(/\/$/, '') + '/' + bucket, STORAGE_SIGNED_URLS: 'true', STORAGE_FORCE_PATH_STYLE: 'true' });
      storage = bucket;
    } catch { console.log('Local storage unavailable with supplied local credentials. Upload verification blocked.'); }
    finally { client.destroy(); }
  }
  const migration = spawnSync('npm.cmd', ['exec', 'prisma', 'migrate', 'deploy'], { cwd: path.join(root, 'backend'), env, shell: true, encoding: 'utf8' });
  if (migration.status !== 0) throw Error(migration.stderr || 'Migration failed');
  console.log('Isolated test database ready: biblioteca_test_ux05_20261115');
  const server = spawn(process.execPath, ['dist/src/main.js'], { cwd: path.join(root, 'backend'), env, stdio: 'inherit', windowsHide: true });
  fs.writeFileSync(path.join(__dirname, `${artifact}-ambiente.json`), JSON.stringify({ port: 3033, pid: server.pid, database: 'biblioteca_test_ux05_20261115', storage }, null, 2));
  process.on('SIGINT', () => server.kill());
  process.on('SIGTERM', () => server.kill());
  server.on('exit', code => process.exit(code ?? 0));
})().catch(error => { console.error(error.message.replace(/postgresql:\/\/[^\s]+/g, '[database URL omitted]')); process.exitCode = 1; });
