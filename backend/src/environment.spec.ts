import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backendEnvironmentPath, loadBackendEnvironment } from './environment';

describe('backend environment', () => {
  let root: string;
  let backend: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'biblioteca-env-'));
    backend = join(root, 'backend');
    mkdirSync(join(backend, 'src'), { recursive: true });
    mkdirSync(join(backend, 'dist', 'src'), { recursive: true });
    writeFileSync(
      join(backend, 'package.json'),
      JSON.stringify({ name: 'backend' }),
    );
    writeFileSync(
      join(root, '.env'),
      'DATABASE_URL=postgresql://localhost:5432/wrong',
    );
    writeFileSync(
      join(backend, '.env'),
      'DATABASE_URL=postgresql://localhost:5433/local',
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('loads the backend file from source and compiled paths instead of the root file', () => {
    for (const runtime of [
      join(backend, 'src'),
      join(backend, 'dist', 'src'),
    ]) {
      expect(backendEnvironmentPath(runtime)).toBe(join(backend, '.env'));
      const env: NodeJS.ProcessEnv = {};
      expect(loadBackendEnvironment(runtime, env).error).toBeUndefined();
      expect(env.DATABASE_URL).toBe('postgresql://localhost:5433/local');
    }
  });

  it('preserves explicitly injected environments and alternate dotenv files', () => {
    const env = {
      DATABASE_URL: 'postgresql://localhost:5433/biblioteca_test_explicit',
    };
    loadBackendEnvironment(join(backend, 'src'), env);
    expect(env.DATABASE_URL).toContain('biblioteca_test_explicit');
    const alternate = join(root, 'isolated.env');
    writeFileSync(
      alternate,
      'DATABASE_URL=postgresql://localhost:5433/biblioteca_test_alternate',
    );
    const alternateEnv: NodeJS.ProcessEnv = { DOTENV_CONFIG_PATH: alternate };
    loadBackendEnvironment(join(backend, 'dist', 'src'), alternateEnv);
    expect(alternateEnv.DATABASE_URL).toContain('biblioteca_test_alternate');
  });
});
