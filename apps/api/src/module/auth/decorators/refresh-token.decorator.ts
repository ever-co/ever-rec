import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const RefreshToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    const headerToken = request.headers['x-refresh-token'];
    const cookieToken = request.cookies?.refreshToken;

    const token = headerToken || cookieToken;

    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }

    return token;
  },
);
