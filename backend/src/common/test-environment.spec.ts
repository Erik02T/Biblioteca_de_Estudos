import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { prepareTestStorage, requireTestStorage } from './test-environment';

describe('isolamento das fixtures de storage', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://fixture:fixture@localhost/biblioteca_test_ci',
      STORAGE_BUCKET: 'biblioteca-test-f7-ci',
      STORAGE_ENDPOINT: 'http://localhost:9000',
      STORAGE_REGION: 'us-east-1',
      STORAGE_ACCESS_KEY_ID: 'fixture-access',
      STORAGE_SECRET_ACCESS_KEY: 'fixture-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnvironment;
    jest.restoreAllMocks();
  });

  it.each([
    ['NODE_ENV', 'production'],
    [
      'DATABASE_URL',
      'postgresql://fixture:fixture@localhost/biblioteca_estudos',
    ],
    ['DATABASE_URL', 'postgresql://fixture:fixture@remote/biblioteca_test_ci'],
    ['STORAGE_BUCKET', 'biblioteca-prod'],
    ['STORAGE_ENDPOINT', 'https://storage.example.com'],
    ['STORAGE_ENDPOINT', 'http://localhost:9001'],
    ['STORAGE_ENDPOINT', 'http://localhost:9000/other'],
    ['STORAGE_ENDPOINT', 'http://localhost:9000?other=true'],
    ['STORAGE_ENDPOINT', 'http://user:password@localhost:9000'],
    ['STORAGE_ACCESS_KEY_ID', ''],
    ['STORAGE_SECRET_ACCESS_KEY', ''],
  ])('recusa %s fora das fixtures antes de acessar S3', async (key, value) => {
    process.env[key] = value;
    const send = jest.spyOn(S3Client.prototype, 'send');
    await expect(prepareTestStorage()).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it.each(['localhost', '127.0.0.1'])(
    'aceita MinIO local em %s',
    (hostname) => {
      process.env.STORAGE_ENDPOINT = `http://${hostname}:9000`;
      expect(() => requireTestStorage()).not.toThrow();
    },
  );

  it('cria o bucket antes da suíte e libera o cliente S3', async () => {
    const send = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
    const destroy = jest.spyOn(S3Client.prototype, 'destroy');
    await prepareTestStorage();
    expect(send).toHaveBeenCalledWith(expect.any(CreateBucketCommand));
    expect((send.mock.calls[0][0] as CreateBucketCommand).input.Bucket).toBe(
      'biblioteca-test-f7-ci',
    );
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('aceita um bucket já pertencente às fixtures', async () => {
    const error = Object.assign(new Error('fixture'), {
      name: 'BucketAlreadyOwnedByYou',
    });
    jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => {
      throw error;
    });
    await expect(prepareTestStorage()).resolves.toBeUndefined();
  });

  it('propaga falhas e não aceita colisão com bucket de outro proprietário', async () => {
    const error = Object.assign(new Error('fixture'), {
      name: 'BucketAlreadyExists',
    });
    jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => {
      throw error;
    });
    const destroy = jest.spyOn(S3Client.prototype, 'destroy');
    await expect(prepareTestStorage()).rejects.toBe(error);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
