import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AuthRateLimitGuard } from './rate-limit.guard';

function context(path: string, ip: string, userAgent = 'test-agent') {
  const request = { path, ip, headers: { 'user-agent': userAgent } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthRateLimitGuard', () => {
  afterEach(() => jest.useRealTimers());

  it('does not let a caller bypass limits by changing User-Agent', () => {
    const guard = new AuthRateLimitGuard();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(
        guard.canActivate(
          context('/auth/login', '192.0.2.1', `agent-${attempt}`),
        ),
      ).toBe(true);
    }

    expect(() =>
      guard.canActivate(context('/auth/login', '192.0.2.1')),
    ).toThrow(
      new HttpException(
        'Muitas tentativas. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });

  it('expires stale buckets and bounds the number of tracked IPs', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const guard = new AuthRateLimitGuard();

    for (let index = 0; index < 10_000; index += 1) {
      expect(
        guard.canActivate(
          context('/areas', `192.0.${Math.floor(index / 256)}.${index % 256}`),
        ),
      ).toBe(true);
    }

    expect(() => guard.canActivate(context('/areas', '198.51.100.1'))).toThrow(
      HttpException,
    );

    jest.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(guard.canActivate(context('/areas', '198.51.100.1'))).toBe(true);
  });
});
