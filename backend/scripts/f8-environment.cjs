// Exclusive local fixtures. This module never reads .env or resets resources.
const { randomBytes } = require('node:crypto');
const database = process.env.F8_TEST_DATABASE || 'biblioteca_test_f8_20261116';
const bucket = process.env.F8_TEST_BUCKET || 'biblioteca-test-f7-f8-20261116';
if (!/^biblioteca_test_f8_[a-z0-9_]+$/.test(database) || !/^biblioteca-test-f7-f8-[a-z0-9-]+$/.test(bucket)) throw Error('F8 requires exclusive local fixtures');
module.exports = {
  database, bucket,
  env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: `postgresql://biblioteca:biblioteca@localhost:5433/${database}`, JWT_SECRET: randomBytes(48).toString('hex'), STORAGE_BUCKET: bucket, STORAGE_ENDPOINT: 'http://localhost:9000', STORAGE_PUBLIC_URL: `http://localhost:9000/${bucket}`, STORAGE_REGION: 'us-east-1', STORAGE_ACCESS_KEY_ID: 'biblioteca_storage', STORAGE_SECRET_ACCESS_KEY: 'biblioteca_storage_dev_2026', STORAGE_FORCE_PATH_STYLE: 'true', STORAGE_SIGNED_URLS: 'true', FRONTEND_URL: 'http://localhost:3028', PORT: '3027' },
};
