import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getUserAndWorkspace } from './utils';

// Look getUserAndWorkspace for details
@Injectable()
export class IsWorkspaceAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    // left blank intentionally
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const { user, workspace } = await getUserAndWorkspace(context);

      return user?.id === workspace.admin;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
