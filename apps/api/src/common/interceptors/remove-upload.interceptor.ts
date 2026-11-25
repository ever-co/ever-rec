import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { Observable, catchError, concatMap, from, throwError } from 'rxjs';

/**
 * Removes the temporary file that a disk-storage file interceptor wrote, once the request is done,
 * however it ends: refused by a pipe or a param decorator (400, 401), failed (500), or answered
 * without using the file. Otherwise every refused upload stays on the API disk for good.
 *
 * List it right after the file interceptor, and only on a route whose handler is done with the
 * file when it returns (nothing reads the file in the background afterwards).
 */
@Injectable()
export class RemoveUploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const remove = async () => {
      const path: unknown = req.file?.path;
      if (typeof path === 'string') {
        // Already gone when the conversion removed it: nothing to do.
        await unlink(path).catch(() => undefined);
      }
    };

    return next.handle().pipe(
      concatMap(async (value) => {
        await remove();
        return value;
      }),
      catchError((error) =>
        from(remove()).pipe(concatMap(() => throwError(() => error))),
      ),
    );
  }
}
