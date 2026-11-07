import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { EverInstanceService } from './ever-instance.service';

/**
 * Runs the existing `AuthGuard` and answers 404 instead of 401: a route of the Ever Platform
 * modules does not exist for a signed-out caller.
 */
async function signedInUid(authGuard: AuthGuard, context: ExecutionContext): Promise<string> {
  try {
    await authGuard.canActivate(context);
  } catch {
    throw new NotFoundException();
  }
  const uid = context.switchToHttp().getRequest()?.user?.id;
  if (typeof uid !== 'string' || !uid) {
    throw new NotFoundException();
  }
  return uid;
}

/** Signed-in callers only; everyone else gets 404. */
@Injectable()
export class EverSignedInGuard implements CanActivate {
  constructor(private readonly authGuard: AuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await signedInUid(this.authGuard, context);
    return true;
  }
}

/**
 * The operator of the installation only (`SUPER_ADMIN_ACCOUNT_UID` or `EVER_OPERATOR_UIDS`). A
 * signed-in user who is not the operator, a workspace admin included, gets 404, like a caller who
 * is not signed in: instance-wide figures stay with the operator.
 */
@Injectable()
export class EverOperatorGuard implements CanActivate {
  constructor(
    private readonly authGuard: AuthGuard,
    private readonly instance: EverInstanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const uid = await signedInUid(this.authGuard, context);
    if (!this.instance.isOperator(uid)) {
      throw new NotFoundException();
    }
    return true;
  }
}
