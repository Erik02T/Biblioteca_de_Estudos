// Local npm entrypoints use a deliberate environment source instead of stale shell values.
// Direct/production entrypoints and explicitly selected test environments keep env precedence.
const { config } = require('dotenv');
const { join, resolve } = require('node:path');
const { spawn } = require('node:child_process');

function loadLocalEnvironment(backendDirectory, inherited = process.env) {
  const environment = { ...inherited };
  const envPath = environment.DOTENV_CONFIG_PATH
    ? resolve(backendDirectory, environment.DOTENV_CONFIG_PATH)
    : join(backendDirectory, '.env');
  const preferFile = !['production', 'test'].includes(environment.NODE_ENV);
  const result = config({
    path: envPath,
    processEnv: environment,
    override: preferFile,
    quiet: true,
  });
  if (result.error && preferFile) {
    throw new Error(
      `Não foi possível ler ${envPath}. Configure o arquivo de ambiente do backend antes de iniciar.`,
    );
  }
  if (preferFile && !result.parsed?.DATABASE_URL) {
    throw new Error(
      `Configure DATABASE_URL no arquivo ${envPath} antes de iniciar.`,
    );
  }
  return { environment, envPath, preferFile };
}

function start() {
  const backendDirectory = resolve(__dirname, '..');
  const { environment, envPath, preferFile } =
    loadLocalEnvironment(backendDirectory);
  let database;
  try {
    database = new URL(environment.DATABASE_URL);
    if (!['postgresql:', 'postgres:'].includes(database.protocol))
      throw new Error();
  } catch {
    throw new Error(
      'DATABASE_URL ausente ou inválida. Configure uma URL PostgreSQL no ambiente selecionado.',
    );
  }
  console.log(
    `[backend] Configuração ${preferFile ? 'local' : 'com precedência do processo'}: ${envPath}`,
  );
  if (
    preferFile &&
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL !== environment.DATABASE_URL
  ) {
    console.log(
      '[backend] DATABASE_URL herdada do terminal substituída pela configuração local selecionada.',
    );
  }
  // Do not print credentials, URL parameters or the full connection string.
  console.log(
    `[backend] PostgreSQL: ${database.hostname}:${database.port || '5432'}${database.pathname}`,
  );
  const child = spawn(
    process.execPath,
    [
      require.resolve('@nestjs/cli/bin/nest.js'),
      'start',
      ...process.argv.slice(2),
    ],
    {
      cwd: backendDirectory,
      env: environment,
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  child.on('error', () => {
    console.error(
      '[backend] Não foi possível iniciar o Nest CLI. Verifique a instalação das dependências.',
    );
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => child.kill(signal));
}

module.exports = { loadLocalEnvironment };
if (require.main === module) {
  try {
    start();
  } catch (error) {
    console.error(`[backend] ${error.message}`);
    process.exitCode = 1;
  }
}
