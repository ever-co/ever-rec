import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestUser } from '../guards/auth.guard';

export const User = createParamDecorator(
  async (data: unknown, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest<{ user?: IRequestUser }>();
    return req.user;
  }
);
