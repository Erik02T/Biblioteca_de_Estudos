// Fixed, exclusive F12 resources. Never loads the habitual .env.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const privateDir = path.join(root, '.f12-artifacts');
const publicDir = path.join(root, 'output/playwright');
const database = 'biblioteca_test_f8_f12_20261117';
const bucket = 'biblioteca-test-f7-f8-f12-20261117';
fs.mkdirSync(privateDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });
const secretFile = path.join(privateDir, 'session-secret');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(48).toString('hex'), { flag: 'wx' });
process.env.F8_TEST_DATABASE = database;
process.env.F8_TEST_BUCKET = bucket;
const { env: fixtureEnv } = require('./f8-environment.cjs');
const env = { ...fixtureEnv, JWT_SECRET: fs.readFileSync(secretFile, 'utf8'), PORT: '3067', FRONTEND_URL: 'http://localhost:3068' };
const webEnv = { ...env, NODE_ENV: 'production', NEXT_DIST_DIR: '.next-f12', ALLOW_LOOPBACK_IN_BUILD: 'true', NEXT_PUBLIC_API_URL: 'http://localhost:3067', NEXT_PUBLIC_STORAGE_URL: `http://localhost:9000/${bucket}` };
module.exports = { root, privateDir, publicDir, database, bucket, env, webEnv };
