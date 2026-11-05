import type { Request } from 'express';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';
import { isAreaWriteAuthorized } from './area-write-preauth';

type SessionLookup = {
  where: {
    id: string;
    userId: string;
    revokedAt: null;
    expiresAt: { gt: Date };
  };
  select: { id: true };
};

describe('isAreaWriteAuthorized', () => {
  const request = {
    headers: { authorization: 'Bearer access-token' },
  } as Request;
  const jwt = { verifyAsync: jest.fn() };
  const prisma = {
    session: {
      findFirst: jest.fn<Promise<{ id: string } | null>, [SessionLookup]>(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts a valid token with an active session', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-id', sid: 'session-id' });
    prisma.session.findFirst.mockResolvedValue({ id: 'session-id' });

    await expect(
      isAreaWriteAuthorized(
        request,
        jwt as unknown as JwtService,
        prisma as unknown as PrismaService,
      ),
    ).resolves.toBe(true);
    expect(prisma.session.findFirst).toHaveBeenCalledTimes(1);
    const query = prisma.session.findFirst.mock.calls[0][0];
    expect(query.where.id).toBe('session-id');
    expect(query.where.userId).toBe('user-id');
    expect(query.where.revokedAt).toBeNull();
    expect(query.where.expiresAt.gt).toBeInstanceOf(Date);
  });

  it('rejects requests without a bearer token before querying the database', async () => {
    await expect(
      isAreaWriteAuthorized(
        { headers: {} } as Request,
        jwt as unknown as JwtService,
        prisma as unknown as PrismaService,
      ),
    ).resolves.toBe(false);

    expect(jwt.verifyAsync).not.toHaveBeenCalled();
    expect(prisma.session.findFirst).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens and revoked or expired sessions', async () => {
    jwt.verifyAsync.mockRejectedValueOnce(new Error('invalid token'));
    await expect(
      isAreaWriteAuthorized(
        request,
        jwt as unknown as JwtService,
        prisma as unknown as PrismaService,
      ),
    ).resolves.toBe(false);
    expect(prisma.session.findFirst).not.toHaveBeenCalled();

    jwt.verifyAsync.mockResolvedValueOnce({
      sub: 'user-id',
      sid: 'session-id',
    });
    prisma.session.findFirst.mockResolvedValueOnce(null);
    await expect(
      isAreaWriteAuthorized(
        request,
        jwt as unknown as JwtService,
        prisma as unknown as PrismaService,
      ),
    ).resolves.toBe(false);
  });
});
