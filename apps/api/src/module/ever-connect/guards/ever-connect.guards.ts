import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { EverInstanceService } from '../../ever-instance/ever-instance.service';
import { EverConnectStoreService } from '../services/ever-connect-store.service';

async function signedInUid(
  authGuard: AuthGuard,
  context: ExecutionContext,
): Promise<string | null> {
  try {
    await authGuard.canActivate(context);
  } catch {
    return null;
  }
  const uid = context.switchToHttp().getRequest()?.user?.id;
  return typeof uid === 'string' && uid ? uid : null;
}

/**
 * The operator of a self-hosted installation only (`SUPER_ADMIN_ACCOUNT_UID`, `EVER_OPERATOR_UIDS`).
 * Everyone else (a workspace admin included, and anyone not signed in) gets 404, and so does every
 * caller on Ever Cloud (`EVER_INSTALL_SOURCE=cloud`), where the connection is made with
 * `EVER_CONNECT_CODE` and managed from app.ever.co.
 */
@Injectable()
export class EverConnectOperatorGuard implements CanActivate {
  constructor(
    private readonly authGuard: AuthGuard,
    private readonly instance: EverInstanceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.instance.isCloudManaged()) throw new NotFoundException();
    const uid = await signedInUid(this.authGuard, context);
    if (!uid || !this.instance.isOperator(uid)) throw new NotFoundException();
    return true;
  }
}

/**
 * The admin of the workspace named by `:workspaceId` (the rule of the workspace routes: 403 for
 * anyone else who is signed in; 401 when not signed in).
 */
@Injectable()
export class EverConnectWorkspaceAdminGuard implements CanActivate {
  constructor(
    private readonly authGuard: AuthGuard,
    private readonly store: EverConnectStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.authGuard.canActivate(context);
    const request = context.switchToHttp().getRequest();
    const uid = request?.user?.id;
    const workspace = await this.store.workspace(request?.params?.workspaceId);
    if (!workspace || typeof uid !== 'string' || workspace.admin !== uid) {
      throw new ForbiddenException();
    }
    request.everConnectWorkspace = workspace;
    return true;
  }
}
