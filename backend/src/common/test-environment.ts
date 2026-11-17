/** Fail closed before any integration test connects to a database. */
export function requireTestDatabase() {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://invalid/unknown',
  );
  if (
    process.env.NODE_ENV !== 'test' ||
    !/^\/biblioteca_test_[a-z0-9_]+$/.test(url.pathname) ||
    !['localhost', '127.0.0.1'].includes(url.hostname)
  ) {
    throw new Error(
      'Integração exige NODE_ENV=test e banco local biblioteca_test_* exclusivo.',
    );
  }
}
