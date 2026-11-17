// Local test database only. Never prints credentials or modifies a pre-existing database.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync, spawn } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const { PrismaClient } = require(path.join(root, 'backend/node_modules/@prisma/client'));
const { parse } = require(path.join(root, 'backend/node_modules/dotenv'));
(async () => {
  const local = parse(fs.readFileSync(path.join(root, 'backend/.env')));
  const database = new URL(local.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.port !== '5433') throw Error('Expected local PostgreSQL on 5433');
  database.pathname = '/postgres';
  const admin = new PrismaClient({ datasources: { db: { url: database.href } } });
  try {
    const existing = await admin.$queryRaw`SELECT datname FROM pg_database WHERE datname = 'biblioteca_test_ux04_20261115'`;
    if (!existing.length) await admin.$executeRawUnsafe('CREATE DATABASE biblioteca_test_ux04_20261115');
  } finally { await admin.$disconnect(); }
  database.pathname = '/biblioteca_test_ux04_20261115';
  const env = { ...process.env, NODE_ENV: 'test', DOTENV_CONFIG_PATH: 'NUL', DATABASE_URL: database.href, JWT_SECRET: crypto.randomBytes(48).toString('hex'), PORT: '3029', FRONTEND_URL: 'http://localhost:3001' };
  const migration = spawnSync('npm.cmd', ['exec', 'prisma', 'migrate', 'deploy'], { cwd: path.join(root, 'backend'), env, shell: true, encoding: 'utf8' });
  if (migration.status !== 0) throw Error(migration.stderr || 'Migration failed');
  console.log('Isolated test database ready: biblioteca_test_ux04_20261115');
  const server = spawn(process.execPath, ['dist/src/main.js'], { cwd: path.join(root, 'backend'), env, stdio: 'inherit', windowsHide: true });
  process.on('SIGINT', () => server.kill());
  process.on('SIGTERM', () => server.kill());
  server.on('exit', code => process.exit(code ?? 0));
})().catch(error => { console.error(error.message.replace(/postgresql:\/\/[^\s]+/g, '[database URL omitted]')); process.exitCode = 1; });
