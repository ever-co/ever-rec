import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { is_id } from '../validators/id.validator';
import { isWorkspaceMember } from './CanAccessWorkspace.guard';

/**
 * Same rule as `CanAccessWorkspaceGuard`, for routes that name the workspace in the query string
 * (`?workspaceId=`) instead of the path. No workspace id (or an empty one) means the caller's own
 * library, which the service keys by the signed-in user, so it passes. Any other value must be a
 * plain id of a workspace the user administers or belongs to; otherwise 403, which also hides
 * which workspaces exist. A repeated `workspaceId` (an array) is refused.
 *
 * Must run after `AuthGuard`, which attaches the user to the request.
 */
@Injectable()
export class CanAccessWorkspaceQueryGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const workspaceId = req.query?.workspaceId;

    if (workspaceId === undefined || workspaceId === '') {
      return true;
    }

    const userId = req.user?.id;
    if (
      !userId ||
      typeof workspaceId !== 'string' ||
      !is_id(workspaceId) ||
      !(await isWorkspaceMember(userId, workspaceId))
    ) {
      throw new ForbiddenException('Access to this workspace is not allowed');
    }

    return true;
  }
}
