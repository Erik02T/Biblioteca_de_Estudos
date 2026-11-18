// Local fixtures only. Never loads backend/.env or points at the normal library.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const database = process.env.F7_TEST_DATABASE || 'biblioteca_test_f7';
const bucket = process.env.F7_TEST_BUCKET || 'biblioteca-test-f7';
if (!/^biblioteca_test_[a-z0-9_]+$/.test(database) || !/^biblioteca-test-f7[a-z0-9-]*$/.test(bucket)) throw Error('Invalid isolated test resource name');
const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--runInBand', ...process.argv.slice(2)], {
  cwd: path.join(__dirname, '..'), stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: `postgresql://biblioteca:biblioteca@localhost:5433/${database}`, STORAGE_BUCKET: bucket, STORAGE_ENDPOINT: 'http://localhost:9000', STORAGE_PUBLIC_URL: `http://localhost:9000/${bucket}`, STORAGE_ACCESS_KEY_ID: 'biblioteca_storage', STORAGE_SECRET_ACCESS_KEY: 'biblioteca_storage_dev_2026', STORAGE_FORCE_PATH_STYLE: 'true' },
});
process.exit(result.status ?? 1);
