import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';

// Locate the backend package from either src/ or dist/src/, independently of cwd.
export function backendEnvironmentPath(runtimeDirectory: string): string {
  let directory = runtimeDirectory;
  while (true) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as {
        name?: string;
      };
      if (pkg.name === 'backend') return join(directory, '.env');
    }
    const parent = dirname(directory);
    if (parent === directory)
      throw new Error('Não foi possível localizar o pacote backend.');
    directory = parent;
  }
}

export function loadBackendEnvironment(
  runtimeDirectory = __dirname,
  environment: NodeJS.ProcessEnv = process.env,
) {
  return config({
    path:
      environment.DOTENV_CONFIG_PATH ??
      backendEnvironmentPath(runtimeDirectory),
    processEnv: environment,
    override: false,
    quiet: true,
  });
}

loadBackendEnvironment();
