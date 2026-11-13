import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { Observable } from 'rxjs';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import {
  canAccessFolderById,
  canWriteVideoByName,
  getUserAndWorkspace,
} from '../guards/utils';
import { is_id } from '../validators/id.validator';
import { is_video_filename } from '../validators/video-filename.validator';

const MAX_FILE_NAME_LENGTH = 256;

/**
 * Checks a workspace video upload by what the request body says, which a guard cannot see: a
 * multipart body is parsed by the file interceptor, after the guards. List it after the file
 * interceptor, so `req.body` is filled.
 *
 * - `fullFileName` must be a plain video file name (no path separators), because it becomes the
 *   storage path of the file.
 * - The folder the upload goes to is the one in the body, so the caller needs WRITE on that folder.
 * - Storing a file under a name replaces the file of any video that has that name, so the caller
 *   needs WRITE on every video of the workspace that already uses it.
 *
 * A refused upload removes the temporary file the file interceptor already wrote.
 */
@Injectable()
export class WorkspaceVideoWriteInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    const body = req.body ?? {};
    const fileName: unknown = body.fullFileName;
    const folderId: unknown = body.folderId;

    try {
      if (
        typeof fileName !== 'string' ||
        fileName.length > MAX_FILE_NAME_LENGTH ||
        !is_video_filename(fileName)
      ) {
        throw new BadRequestException(
          'fullFileName must be a plain video file name',
        );
      }
      if (
        folderId !== undefined &&
        folderId !== false &&
        folderId !== 'false' &&
        !(typeof folderId === 'string' && is_id(folderId))
      ) {
        throw new BadRequestException('folderId is not a valid folder id');
      }

      let allowed = false;
      try {
        const { user, workspace } = await getUserAndWorkspace(context);
        allowed =
          canAccessFolderById(
            folderId,
            workspace,
            user,
            PermissionAccessEnum.WRITE,
          ) && canWriteVideoByName(workspace, user, fileName);
      } catch (e) {
        console.log(e);
      }
      if (!allowed) {
        throw new ForbiddenException(
          'You are not allowed to upload this video here',
        );
      }
    } catch (e) {
      if (typeof req.file?.path === 'string') {
        await unlink(req.file.path).catch(() => undefined);
      }
      throw e;
    }

    return next.handle();
  }
}
