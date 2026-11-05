import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type Bucket = { count: number; resetAt: number };

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly authLimit = 10;
  private readonly apiLimit = 120;
  private readonly maxBuckets = 10_000;
  private readonly windowMs = 15 * 60 * 1000;
  private readonly cleanupIntervalMs = 60 * 1000;
  private lastCleanupAt = 0;

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const isAuth = request.path.startsWith('/auth/');
    const key = `${isAuth ? 'auth' : 'api'}:${request.ip ?? 'unknown'}`;
    const limit = isAuth ? this.authLimit : this.apiLimit;
    const now = Date.now();
    if (now - this.lastCleanupAt >= this.cleanupIntervalMs) {
      this.removeExpiredBuckets(now);
    }

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (bucket) this.buckets.delete(key);
      if (this.buckets.size >= this.maxBuckets) {
        throw new HttpException(
          'Muitas tentativas. Tente novamente mais tarde.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (bucket.count >= limit)
      throw new HttpException(
        'Muitas tentativas. Tente novamente mais tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    bucket.count += 1;
    return true;
  }

  private removeExpiredBuckets(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    this.lastCleanupAt = now;
  }
}
