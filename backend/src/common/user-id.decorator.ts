import {
  BadRequestException,
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

export const UserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<{ userId: string }>();
    return request.userId;
  },
);

@Injectable()
export class UserIdGuard implements CanActivate {
  private readonly uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      userId?: string;
    }>();
    const userId = request.headers['x-user-id'];

    if (typeof userId !== 'string' || !this.uuidRegex.test(userId)) {
      throw new BadRequestException('Header X-User-Id ausente ou inválido');
    }

    request.userId = userId;
    return true;
  }
}
