import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';

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

/** Storage mutations must use the same exclusive, local fixture boundary. */
export function requireTestStorage() {
  requireTestDatabase();
  const endpoint = new URL(process.env.STORAGE_ENDPOINT ?? 'https://invalid');
  if (
    !/^biblioteca-test-f7(?:-[a-z0-9]+)*$/.test(
      process.env.STORAGE_BUCKET ?? '',
    ) ||
    endpoint.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(endpoint.hostname) ||
    endpoint.port !== '9000' ||
    endpoint.pathname !== '/' ||
    endpoint.search !== '' ||
    endpoint.hash !== '' ||
    endpoint.username !== '' ||
    endpoint.password !== '' ||
    !process.env.STORAGE_ACCESS_KEY_ID ||
    !process.env.STORAGE_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      'Integração exige bucket biblioteca-test-f7* e credenciais de MinIO local na porta 9000.',
    );
  }
}

/** Every storage suite can start first against an empty fixture environment. */
export async function prepareTestStorage() {
  requireTestStorage();
  const client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
  });
  try {
    await client.send(
      new CreateBucketCommand({ Bucket: process.env.STORAGE_BUCKET }),
    );
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'BucketAlreadyOwnedByYou') {
      throw error;
    }
  } finally {
    client.destroy();
  }
}
