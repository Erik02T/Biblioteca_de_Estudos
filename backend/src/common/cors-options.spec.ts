import { createCorsOptions } from './cors-options';
describe('CORS das integrações locais', () => {
  it.each([
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://[::1]:3001',
  ])('aceita a origem local equivalente %s', (origin) => {
    const callback = jest.fn();
    createCorsOptions().origin(origin, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });
  it('mantém porta e protocolo explícitos e aceita aliases da origem configurada', () => {
    const options = createCorsOptions(
      'http://localhost:3018,https://example.com',
    );
    const allowed = jest.fn();
    options.origin('http://127.0.0.1:3018', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);
    for (const origin of [
      'http://127.0.0.1:9999',
      'https://127.0.0.1:3018',
      'https://untrusted.example',
    ]) {
      const callback = jest.fn<void, [Error | null, boolean?]>();
      options.origin(origin, callback);
      expect(callback.mock.calls[0][0]).toBeInstanceOf(Error);
    }
  });
  it('preserva a origem externa configurada e requests sem Origin', () => {
    const options = createCorsOptions('https://example.com/');
    for (const origin of ['https://example.com', undefined]) {
      const callback = jest.fn();
      options.origin(origin, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    }
  });
});
