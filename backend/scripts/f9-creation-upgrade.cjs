// Repair the identified local F8 prerequisite without resetting the library.
// Backups contain private data and remain in the ignored F7/F8 artifact folders.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const { spawnSync, spawn } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { loadLocalEnvironment } = require('./start-local.cjs');
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const cwd = path.resolve(__dirname, '..');
const { environment: env } = loadLocalEnvironment(cwd);
const source = new URL(env.DATABASE_URL);
assert(
  ['localhost', '127.0.0.1'].includes(source.hostname) &&
    source.port === '5433' &&
    source.pathname === '/biblioteca_estudos',
  'Only the identified local library is allowed',
);
assert(
  !env.DOTENV_CONFIG_PATH,
  'This recovery uses the default local environment and existing backup helper',
);
assert(
  /^http:\/\/(localhost|127\.0\.0\.1):9000$/.test(env.STORAGE_ENDPOINT),
  'Local storage required',
);
const mode = process.argv[2] || 'inspect';
const run = process.env.F9_LOCAL_UPGRADE_RUN;
assert(
  mode === 'inspect' || /^\d{8}_\d{6}$/.test(run || ''),
  'Set F9_LOCAL_UPGRADE_RUN=YYYYMMDD_HHMMSS',
);
const directory = path.resolve(
  cwd,
  '../.f8-artifacts/f9-creation-upgrade-' + run,
);
const backupDirectory = path.resolve(
  cwd,
  '../.f7-artifacts/local-upgrade-' + run,
);
const cloneDatabase = 'biblioteca_test_f7_upgrade_' + run;
const cloneBucket =
  'biblioteca-test-f7-upgrade-' + (run || '').replace('_', '-');
const clone = new URL(source);
clone.pathname = '/' + cloneDatabase;
const container = 'biblioteca_de_estudos-postgres-1';
const migration = '20261116120000_f8_creation_requests';
const tables = [
  'User',
  'Session',
  'Area',
  'Attachment',
  'Template',
  'ViewConfiguration',
  'PageRevision',
  'RevisionFile',
];
const reportPath = path.join(directory, 'report.json');
const readReport = () => JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const writeReport = (report) =>
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
const db = (url) =>
  new PrismaClient({ datasources: { db: { url: url.toString() } } });
async function withDb(url, operation) {
  const client = db(url);
  try {
    return await operation(client);
  } finally {
    await client.$disconnect();
  }
}
async function inventory(url) {
  return withDb(url, async (client) =>
    Object.fromEntries(
      await Promise.all(
        tables.map(async (table) => {
          const [entry] = await client.$queryRawUnsafe(
            `SELECT count(*)::int AS count, md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.id)::text, '[]')) AS hash FROM "${table}" t`,
          );
          return [table, entry];
        }),
      ),
    ),
  );
}
async function inspect(url) {
  return withDb(url, async (client) => {
    const applied = await client.$queryRawUnsafe(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name',
    );
    const [receipt] = await client.$queryRawUnsafe(
      'SELECT to_regclass(\'public."AreaCreationRequest"\')::text AS name',
    );
    return {
      database: url.pathname.slice(1),
      migrations: applied.map((item) => item.migration_name),
      creationReceiptTable: receipt.name,
    };
  });
}
function command(program, args, options = {}) {
  const result = spawnSync(program, args, { cwd, env, ...options });
  assert.equal(
    result.status,
    0,
    `${program} operation failed (${result.status}); inspect private artifact logs`,
  );
  return result.stdout;
}
function docker(args, options) {
  return command('docker', ['exec', ...args], options);
}
function helper(action) {
  command(process.execPath, ['scripts/local-upgrade-backup.cjs', action], {
    env: { ...env, LOCAL_UPGRADE_RUN: run },
    stdio: 'inherit',
  });
}
function migrate(url) {
  command(
    process.execPath,
    [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
    { env: { ...env, DATABASE_URL: url.toString() }, stdio: 'inherit' },
  );
}
async function verifySourceStorage() {
  const backup = JSON.parse(
    fs.readFileSync(path.join(backupDirectory, 'inventory.json'), 'utf8'),
  );
  const s3 = new S3Client({
    endpoint: env.STORAGE_ENDPOINT,
    region: env.STORAGE_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
  });
  try {
    const keys = [];
    let token;
    do {
      const listed = await s3.send(
        new ListObjectsV2Command({
          Bucket: env.STORAGE_BUCKET,
          ContinuationToken: token,
        }),
      );
      keys.push(...(listed.Contents || []).map((file) => file.Key));
      token = listed.NextContinuationToken;
    } while (token);
    assert.deepEqual(
      keys.sort(),
      backup.files.map((file) => file.key).sort(),
      'Source object inventory changed',
    );
    for (const file of backup.files) {
      const object = await s3.send(
        new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: file.key }),
      );
      const hash = createHash('sha256')
        .update(Buffer.from(await object.Body.transformToByteArray()))
        .digest('hex');
      assert.equal(hash, file.sha256, 'Source object bytes changed');
    }
    return keys.length;
  } finally {
    s3.destroy();
  }
}
async function main() {
  if (mode === 'inspect') {
    console.log(JSON.stringify(await inspect(source)));
    return;
  }
  if (mode === 'prepare') {
    assert(
      !fs.existsSync(directory) && !fs.existsSync(backupDirectory),
      'Refuse to overwrite an earlier recovery run',
    );
    const state = await inspect(source);
    assert.equal(
      state.creationReceiptTable,
      null,
      'This repair is only for the missing creation receipt table',
    );
    const expected = fs
      .readdirSync(path.join(cwd, 'prisma/migrations'))
      .filter((name) => /^\d/.test(name))
      .sort();
    assert.deepEqual(
      expected.filter((name) => !state.migrations.includes(name)),
      [migration],
      'Unexpected pending migrations',
    );
    fs.mkdirSync(directory, { recursive: true });
    const original = await inventory(source);
    helper('backup');
    const dumpPath = path.join(backupDirectory, 'database.dump');
    const dumpFd = fs.openSync(dumpPath, 'wx');
    try {
      docker(
        [
          container,
          'pg_dump',
          '-U',
          decodeURIComponent(source.username),
          '-d',
          source.pathname.slice(1),
          '-Fc',
        ],
        { stdio: ['ignore', dumpFd, 'pipe'] },
      );
    } finally {
      fs.closeSync(dumpFd);
    }
    assert(fs.statSync(dumpPath).size > 0, 'Empty dump');
    const existing = docker(
      [
        container,
        'psql',
        '-U',
        decodeURIComponent(source.username),
        '-d',
        'postgres',
        '-Atc',
        `SELECT count(*) FROM pg_database WHERE datname='${cloneDatabase}'`,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(existing.trim(), '0', 'Refuse to overwrite a clone');
    docker([
      container,
      'psql',
      '-U',
      decodeURIComponent(source.username),
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `CREATE DATABASE ${cloneDatabase}`,
    ]);
    const restoreFd = fs.openSync(dumpPath, 'r');
    try {
      docker(
        [
          '-i',
          container,
          'pg_restore',
          '-U',
          decodeURIComponent(source.username),
          '-d',
          cloneDatabase,
          '--exit-on-error',
          '--no-owner',
        ],
        { stdio: [restoreFd, 'pipe', 'pipe'] },
      );
    } finally {
      fs.closeSync(restoreFd);
    }
    helper('restore');
    helper('verify-clone');
    assert.deepEqual(
      await inventory(clone),
      original,
      'Restored database differs',
    );
    assert.deepEqual(
      await inventory(source),
      original,
      'Source changed during backup',
    );
    const objects = await verifySourceStorage();
    writeReport({
      run,
      source: state,
      cloneDatabase,
      cloneBucket,
      original,
      objects,
      dumpPath,
      restored: true,
    });
    console.log(
      JSON.stringify({
        action: mode,
        restored: true,
        databaseTables: tables.length,
        objects,
        directory,
        cloneDatabase,
      }),
    );
    return;
  }
  const report = readReport();
  assert(
    report.restored && report.cloneDatabase === cloneDatabase,
    'Verified restore required',
  );
  if (mode === 'migrate-clone') {
    const before = await inventory(clone);
    migrate(clone);
    assert.deepEqual(
      await inventory(clone),
      before,
      'Clone data changed during migration',
    );
    assert(
      (await inspect(clone)).creationReceiptTable,
      'Receipt table still missing',
    );
    report.cloneMigrated = true;
    writeReport(report);
    console.log(
      JSON.stringify({
        action: mode,
        unchanged: true,
        receiptTablePresent: true,
      }),
    );
    return;
  }
  if (mode === 'apply-source') {
    assert(
      report.cloneMigrated &&
        report.httpBefore?.status === 500 &&
        report.httpAfter?.status === 201,
      'Reproduce creation before and after migration on the clone first',
    );
    assert.deepEqual(
      await inventory(source),
      report.original,
      'Source changed; take a new backup before proceeding',
    );
    await verifySourceStorage();
    helper('migrate-source');
    assert.deepEqual(
      await inventory(source),
      report.original,
      'Source rows changed during migration',
    );
    const objects = await verifySourceStorage();
    const state = await inspect(source);
    assert(
      state.creationReceiptTable && state.migrations.includes(migration),
      'Source migration incomplete',
    );
    await withDb(source, (client) =>
      client.areaCreationRequest.findUnique({
        where: {
          userId_key: {
            userId: 'f9-read-only-schema-check',
            key: 'f9-read-only-schema-check',
          },
        },
      }),
    );
    report.sourceVerified = true;
    report.sourceAfter = state;
    writeReport(report);
    console.log(
      JSON.stringify({
        action: mode,
        sourceVerified: true,
        originalRowsUnchanged: true,
        objects,
        receiptLookup: 'PASS',
      }),
    );
    return;
  }
  if (mode === 'serve-clone') {
    const child = spawn(process.execPath, ['dist/src/main.js'], {
      cwd,
      windowsHide: true,
      env: {
        ...env,
        NODE_ENV: 'test',
        DATABASE_URL: clone.toString(),
        STORAGE_BUCKET: cloneBucket,
        STORAGE_PUBLIC_URL: `${env.STORAGE_ENDPOINT}/${cloneBucket}`,
        JWT_SECRET: randomBytes(48).toString('hex'),
        PORT: '3027',
        FRONTEND_URL: 'http://localhost:3028',
      },
      stdio: [
        'ignore',
        fs.openSync(path.join(directory, 'api-out.log'), 'a'),
        fs.openSync(path.join(directory, 'api-err.log'), 'a'),
      ],
    });
    child.on('exit', (code) => {
      process.exitCode = code ?? 1;
    });
    for (const signal of ['SIGINT', 'SIGTERM'])
      process.on(signal, () => child.kill(signal));
    console.log(
      JSON.stringify({
        action: mode,
        pid: child.pid,
        port: 3027,
        cloneDatabase,
      }),
    );
    return;
  }
  if (mode === 'http-before' || mode === 'http-after') {
    const base = 'http://localhost:3027';
    const fixturePath = path.join(directory, 'http-fixture.json');
    let fixture;
    if (mode === 'http-before') {
      const response = await fetch(base + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `f9-repair-${randomBytes(12).toString('hex')}@example.com`,
          password: 'F9-isolated-repair-12345',
        }),
      });
      assert.equal(response.status, 201, 'Fixture registration failed');
      fixture = {
        tokens: await response.json(),
        key: require('node:crypto').randomUUID(),
      };
      fs.writeFileSync(fixturePath, JSON.stringify(fixture), { flag: 'wx' });
    } else fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const request = () =>
      fetch(base + '/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fixture.tokens.accessToken}`,
          'Idempotency-Key': fixture.key,
        },
        body: JSON.stringify({
          section: 'LINGUAGENS',
          subSection: 'ESTUDANDO',
          nome: 'F9 creation repair fixture',
          categoria: 'Geral',
          nivelEntendimento: 0,
          icone: '',
          conteudo: { type: 'doc', content: [{ type: 'paragraph' }] },
        }),
      });
    const response = await request();
    const result = await response.json();
    assert.equal(response.status, mode === 'http-before' ? 500 : 201);
    const listResponse = await fetch(base + '/areas', {
      headers: { Authorization: `Bearer ${fixture.tokens.accessToken}` },
    });
    assert.equal(listResponse.status, 200);
    const listed = await listResponse.json();
    assert.equal(
      listed.pagination.total,
      mode === 'http-before' ? 0 : 1,
      'Unexpected fixture page count',
    );
    if (mode === 'http-after') {
      const repeated = await request();
      assert.equal(repeated.status, 201);
      assert.equal(
        (await repeated.json()).id,
        result.id,
        'Duplicate page after retry',
      );
      report.httpAfter = { status: 201, singlePage: true, sameIdOnRetry: true };
    } else
      report.httpBefore = {
        status: response.status,
        message: result.message,
        zeroPages: true,
      };
    writeReport(report);
    console.log(
      JSON.stringify({
        action: mode,
        result: mode === 'http-before' ? report.httpBefore : report.httpAfter,
      }),
    );
    return;
  }
  throw Error('Unknown mode');
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
