import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getUserAndWorkspace } from './utils';
import { parseCollectionToArray } from '../../../services/utils/helpers';

// Look getUserAndWorkspace for details
@Injectable()
export class CanAccessWorkspaceGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // TODO: fix error cannot read properties of null (reading members)
    return true;
    try {
      const { user, workspace } = await getUserAndWorkspace(context);
      const members = parseCollectionToArray(workspace.members);
      const membersToCheckFrom = [...members, workspace.admin];

      return membersToCheckFrom.includes(user.id);
    } catch (e) {
      console.log(e);
      return false;
    }
  }
}
