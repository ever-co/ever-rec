import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import {
  NAMED_IMAGE_WRITE_METADATA,
  NamedImageWriteOptions,
} from '../decorators/NamedImageWrite.decorator';
import {
  canAccessFolderById,
  canAccessItemData,
  findImagesByFileName,
  getUserAndWorkspace,
} from '../guards/utils';

/**
 * Applies the per-image WRITE rule (the one `CanAccessItemGuard` applies to routes that name the
 * image by id) to routes that write an image under a name from the request. It must be listed
 * after the file interceptor so the multipart fields are already parsed. Chain with
 * `CanAccessWorkspaceGuard`. It fails closed: a missing handler option, an unreadable workspace or
 * any error is a 403.
 */
@Injectable()
export class NamedImageWriteInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    let allowed = false;
    try {
      allowed = await this.isAllowed(context);
    } catch (e) {
      console.log(e);
    }

    if (!allowed) {
      throw new ForbiddenException('Access to this image is not allowed');
    }

    return next.handle();
  }

  private async isAllowed(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<NamedImageWriteOptions | undefined>(
      NAMED_IMAGE_WRITE_METADATA,
      context.getHandler(),
    );
    if (!options) {
      return false;
    }

    const { user, workspace, req } = await getUserAndWorkspace(context);
    const write = PermissionAccessEnum.WRITE;

    // The folder an upload is filed in is named in the body, which no guard can read.
    if (
      options.checkBodyFolder &&
      !this.canWriteBodyFolder(req, workspace, user)
    ) {
      return false;
    }

    const fileName = await options.fileName(req);
    if (typeof fileName !== 'string' || fileName === '') {
      return !!options.nameOptional && fileName === undefined;
    }

    const images = findImagesByFileName(workspace, fileName);
    if (images.length === 0) {
      return !options.mustExist;
    }

    // Every record that uses this file name must be writable by the caller, in its folder too.
    return images.every(
      (image) =>
        canAccessItemData(image, workspace, user, write) &&
        canAccessFolderById(image.parentId, workspace, user, write),
    );
  }

  private canWriteBodyFolder(req: any, workspace: any, user: any): boolean {
    const folderId = req.body?.folderId;
    if (folderId === undefined || folderId === '') {
      return true;
    }
    return (
      typeof folderId === 'string' &&
      canAccessFolderById(
        folderId,
        workspace,
        user,
        PermissionAccessEnum.WRITE,
      )
    );
  }
}
