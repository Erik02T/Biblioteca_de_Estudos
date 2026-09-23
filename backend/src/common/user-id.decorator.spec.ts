import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

describe('AuthGuard', () => {
  const user = { sub: 'user-id', email: 'user@example.com', sid: 'session-id' };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
  const jwt = { verifyAsync: jest.fn().mockResolvedValue(user) };
  const prisma = { session: { findFirst: jest.fn().mockResolvedValue({ id: 'session-id' }) } };
  const guard = new AuthGuard(jwt as never, reflector as never, prisma as never);
  const contextFor = (request: Record<string, unknown>) => ({
    getHandler: jest.fn(), getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  }) as never;

  it('derives the authenticated subject from a Bearer token', async () => {
    const request = { headers: { authorization: 'Bearer signed-token' } } as Record<string, unknown>;
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual(user);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('signed-token');
  });

  it('rejects requests without a token', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid or expired tokens', async () => {
    jwt.verifyAsync.mockRejectedValueOnce(new Error('expired'));
    await expect(guard.canActivate(contextFor({ headers: { authorization: 'Bearer expired' } }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
