import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable, Optional } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class EmailOwnershipGuard implements CanActivate {
  constructor(
    @Optional() @Inject('EMAIL_PROPERTY') private readonly emailProperty: string = 'email',
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;

    if (user[this.emailProperty] !== body[this.emailProperty]) {
      throw new BadRequestException('Requested email does not match authenticated user');
    }

    return true;
  }
}
