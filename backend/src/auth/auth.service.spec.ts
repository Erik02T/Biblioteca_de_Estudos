import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = { id: 'user-id', email: 'user@example.com', passwordHash: 'hash' };
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue(user),
    },
    session: {
      create: jest.fn().mockResolvedValue({ id: 'session-id' }),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const service = new AuthService(prisma as never, jwt as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a user and issues a session on registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.register({ email: ' User@Example.com ', password: 'a-secure-password' })).resolves.toEqual(expect.objectContaining({ accessToken: 'access-token', refreshToken: expect.any(String) }));
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'user@example.com', passwordHash: expect.any(String) }) });
    expect(prisma.session.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'user-id', refreshTokenHash: expect.any(String) }) });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'user-id', email: 'user@example.com', sid: 'session-id' }, expect.any(Object));
  });

  it('rotates a valid refresh token and revokes the old session', async () => {
    prisma.session.findUnique.mockResolvedValue({ id: 'old-session', revokedAt: null, expiresAt: new Date(Date.now() + 60_000), user });
    await expect(service.refresh('refresh-token')).resolves.toEqual(expect.objectContaining({ accessToken: 'access-token' }));
    expect(prisma.session.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'old-session' }, data: expect.objectContaining({ revokedAt: expect.any(Date) }) }));
    expect(prisma.session.create).toHaveBeenCalled();
  });

  it('revokes a refresh token without exposing whether it existed', async () => {
    await expect(service.revoke('refresh-token')).resolves.toEqual({ success: true });
    expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ revokedAt: null }) }));
  });
});