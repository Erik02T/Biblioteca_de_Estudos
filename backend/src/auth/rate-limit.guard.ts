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
  private readonly windowMs = 15 * 60 * 1000;

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const key = `${request.ip ?? 'unknown'}:${request.headers['user-agent'] ?? 'unknown'}`;
    const limit = request.path.startsWith('/auth/')
      ? this.authLimit
      : this.apiLimit;
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
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
}
