import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { loadLocalEnvironment } = require('../scripts/start-local.cjs') as {
  loadLocalEnvironment: (
    directory: string,
    inherited: NodeJS.ProcessEnv,
  ) => { environment: NodeJS.ProcessEnv; envPath: string; preferFile: boolean };
};

describe('local npm startup', () => {
  let root: string;
  let backend: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'biblioteca-startup-'));
    backend = join(root, 'backend');
    mkdirSync(backend);
    writeFileSync(
      join(root, '.env'),
      'DATABASE_URL=postgresql://localhost:5432/wrong',
    );
    writeFileSync(
      join(backend, '.env'),
      'DATABASE_URL=postgresql://localhost:5433/local\nPORT=3000',
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it.each([undefined, 'development'])(
    'uses backend/.env over stale shell configuration with NODE_ENV=%s',
    (NODE_ENV) => {
      const inherited = {
        NODE_ENV,
        DATABASE_URL: 'postgresql://localhost:5432/stale',
      };
      const { environment } = loadLocalEnvironment(backend, inherited);
      expect(environment.DATABASE_URL).toBe(
        'postgresql://localhost:5433/local',
      );
      expect(environment.PORT).toBe('3000');
      expect(inherited.DATABASE_URL).toBe('postgresql://localhost:5432/stale');
    },
  );

  it.each(['test', 'production'])(
    'preserves injected configuration in %s',
    (NODE_ENV) => {
      const inherited = {
        NODE_ENV,
        DATABASE_URL: 'postgresql://localhost:5434/explicit',
        PORT: '3050',
      };
      const { environment, preferFile } = loadLocalEnvironment(
        backend,
        inherited,
      );
      expect(environment.DATABASE_URL).toBe(inherited.DATABASE_URL);
      expect(environment.PORT).toBe('3050');
      expect(preferFile).toBe(false);
    },
  );

  it('honors an explicitly selected file, including a path relative to the backend', () => {
    writeFileSync(
      join(root, 'alternate.env'),
      'DATABASE_URL=postgresql://localhost:5435/alternate',
    );
    const { environment, envPath } = loadLocalEnvironment(backend, {
      DATABASE_URL: 'postgresql://localhost:5432/stale',
      DOTENV_CONFIG_PATH: '../alternate.env',
    });
    expect(environment.DATABASE_URL).toBe(
      'postgresql://localhost:5435/alternate',
    );
    expect(envPath).toBe(join(root, 'alternate.env'));
  });

  it('reports a missing local file instead of silently falling back to stale shell configuration', () => {
    expect(() =>
      loadLocalEnvironment(backend, {
        DATABASE_URL: 'postgresql://localhost:5432/stale',
        DOTENV_CONFIG_PATH: 'missing.env',
      }),
    ).toThrow('Configure o arquivo de ambiente do backend');
  });

  it('does not require a dotenv file for injected production environments', () => {
    const { environment } = loadLocalEnvironment(backend, {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://database:5432/production',
      DOTENV_CONFIG_PATH: 'missing.env',
    });
    expect(environment.DATABASE_URL).toBe(
      'postgresql://database:5432/production',
    );
  });

  it('does not fall back to an inherited database when the local file omits DATABASE_URL', () => {
    writeFileSync(join(backend, '.env'), 'PORT=3000');
    expect(() =>
      loadLocalEnvironment(backend, {
        DATABASE_URL: 'postgresql://localhost:5432/stale',
      }),
    ).toThrow('Configure DATABASE_URL no arquivo');
  });
});
