import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  const user = {
    id: 'user-id',
    email: 'user@example.com',
    passwordHash: 'hash',
  };
  const prisma = {
    user: {
      findUnique: jest.fn<Promise<typeof user | null>, [object]>(),
      create: jest.fn<Promise<typeof user>, [object]>().mockResolvedValue(user),
    },
    session: {
      create: jest
        .fn<Promise<{ id: string }>, [object]>()
        .mockResolvedValue({ id: 'session-id' }),
      findUnique: jest.fn<
        Promise<{
          id: string;
          revokedAt: Date | null;
          expiresAt: Date;
          user: typeof user;
        } | null>,
        [object]
      >(),
      update: jest.fn<Promise<unknown>, [object]>(),
      updateMany: jest.fn<Promise<unknown>, [object]>(),
    },
  } as unknown as jest.Mocked<PrismaService>;
  const jwt = {
    signAsync: jest
      .fn<Promise<string>, [object, object?]>()
      .mockResolvedValue('access-token'),
  } as unknown as jest.Mocked<JwtService>;
  const service = new AuthService(prisma, jwt);

  beforeEach(() => jest.clearAllMocks());

  it('creates a user and issues a session on registration', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Jest mock method returns any, test-specific pattern
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.register({
        email: ' User@Example.com ',
        password: 'a-secure-password',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        accessToken: 'access-token',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
        refreshToken: expect.any(String),
      }),
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
    const createUserCall = expect.objectContaining({
      email: 'user@example.com',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
      passwordHash: expect.any(String),
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: createUserCall, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
    const createSessionCall = expect.objectContaining({
      userId: 'user-id',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
      refreshTokenHash: expect.any(String),
    });

    expect(prisma.session.create).toHaveBeenCalledWith({
      data: createSessionCall, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    });

    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'user-id', email: 'user@example.com', sid: 'session-id' },
      expect.any(Object),
    );
  });

  it('rotates a valid refresh token and revokes the old session', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Jest mock method returns any, test-specific pattern
    prisma.session.findUnique.mockResolvedValue({
      id: 'old-session',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    await expect(service.refresh('refresh-token')).resolves.toEqual(
      expect.objectContaining({ accessToken: 'access-token' }),
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
    const updateSessionCall = expect.objectContaining({
      where: { id: 'old-session' },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
      data: expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
        revokedAt: expect.any(Date),
      }),
    });

    expect(prisma.session.update).toHaveBeenCalledWith(updateSessionCall);

    expect(prisma.session.create).toHaveBeenCalled();
  });

  it('revokes a refresh token without exposing whether it existed', async () => {
    await expect(service.revoke('refresh-token')).resolves.toEqual({
      success: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
    const revokeCall = expect.objectContaining({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Jest matcher returns any, test-specific pattern
      where: expect.objectContaining({ revokedAt: null }),
    });

    expect(prisma.session.updateMany).toHaveBeenCalledWith(revokeCall);
  });
});
