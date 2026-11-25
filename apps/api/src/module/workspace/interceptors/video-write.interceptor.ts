import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { Observable } from 'rxjs';
import { PermissionAccessEnum } from '../Interfaces/Workspace';
import {
  canAccessFolderById,
  findVideosByFileName,
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
 * - The upload stores a new video, so a name that any video of the workspace already has is
 *   refused with 409, whoever asks: two records under one name would share one file, and deleting
 *   either one would delete it. The clients send a new name (a uuid) with every upload.
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

      let refusal: HttpException | null = new ForbiddenException(
        'You are not allowed to upload this video here',
      );
      try {
        const { user, workspace } = await getUserAndWorkspace(context);
        if (
          canAccessFolderById(
            folderId,
            workspace,
            user,
            PermissionAccessEnum.WRITE,
          )
        ) {
          refusal =
            findVideosByFileName(workspace, fileName).length > 0
              ? new ConflictException(
                  'A video of this workspace already has this file name',
                )
              : null;
        }
      } catch (e) {
        console.log(e);
      }
      if (refusal) {
        throw refusal;
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
