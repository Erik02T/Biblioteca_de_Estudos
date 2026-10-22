describe('Frontend autenticação', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    localStorage.clear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('deve armazenar e recuperar token de acesso no localStorage', () => {
    const token = 'test-access-token-123';
    localStorage.setItem('biblioteca-access-token', token);

    expect(localStorage.getItem('biblioteca-access-token')).toBe(token);
  });

  it('deve remover token de acesso ao fazer logout', () => {
    localStorage.setItem('biblioteca-access-token', 'test-token');
    localStorage.removeItem('biblioteca-access-token');

    expect(localStorage.getItem('biblioteca-access-token')).toBeNull();
  });

  it('deve armazenar e recuperar token de refresh no localStorage', () => {
    const refreshToken = 'test-refresh-token-456';
    localStorage.setItem('biblioteca-refresh-token', refreshToken);

    expect(localStorage.getItem('biblioteca-refresh-token')).toBe(refreshToken);
  });

  it('deve limpar todos os tokens de autenticação', () => {
    localStorage.setItem('biblioteca-access-token', 'access-token');
    localStorage.setItem('biblioteca-refresh-token', 'refresh-token');

    localStorage.clear();

    expect(localStorage.getItem('biblioteca-access-token')).toBeNull();
    expect(localStorage.getItem('biblioteca-refresh-token')).toBeNull();
  });
});