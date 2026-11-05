import type { Request } from 'express';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';

type SessionPayload = { sub: string; sid: string };

export async function isAreaWriteAuthorized(
  request: Request,
  jwt: JwtService,
  prisma: PrismaService,
): Promise<boolean> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return false;

  let payload: unknown;
  try {
    payload = await jwt.verifyAsync<Record<string, unknown>>(
      authorization.slice(7),
    );
  } catch {
    return false;
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('sub' in payload) ||
    !('sid' in payload) ||
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    !payload.sub ||
    !payload.sid
  ) {
    return false;
  }

  const sessionPayload: SessionPayload = {
    sub: payload.sub,
    sid: payload.sid,
  };

  const activeSession = await prisma.session.findFirst({
    where: {
      id: sessionPayload.sid,
      userId: sessionPayload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  return activeSession !== null;
}
