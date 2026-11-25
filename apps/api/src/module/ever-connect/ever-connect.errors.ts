import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import {
  EgressRefusedError,
  EntitlementError,
  KeyManifestError,
  NotConnectedError,
  ProblemError,
  RateLimitedError,
  ResponseTooLargeError,
  TimeoutError,
} from '@ever-co/connect-sdk';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { errorCode } from './services/ever-connect-client.service';

/**
 * The redeem answers of Ever Platform that refuse the connect code itself (unknown, used, expired,
 * or minted for another product): the operator mints a new code.
 */
export const CODE_REFUSALS: ReadonlySet<string> = new Set([
  'not_found',
  'code_invalid',
  'code_expired',
  'product_mismatch',
]);

/**
 * The platform refused the connect code of a redeem. Still a {@link ProblemError}, so the
 * first-boot code (`EVER_CONNECT_CODE`) treats it as an answer of the platform.
 */
export class ConnectCodeRefusedError extends ProblemError {
  constructor(source: ProblemError) {
    super(source.status, source.code);
  }
}

/** An answer of the module's routes: a status and a code, never a message or detail of the platform. */
function answer(statusCode: number, code: string): HttpException {
  return new HttpException({ statusCode, code }, statusCode);
}

/**
 * A `fetch` that could not reach the server at all (Node rejects with `TypeError: fetch failed`).
 * Compared by name, not `instanceof`: the error may come from another realm.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return name === 'TypeError' && message === 'fetch failed';
}

/**
 * The answer to a route whose call to Ever Platform failed, or `null` for any other error (an
 * `HttpException` keeps its own answer; anything else stays a 500).
 *
 * The platform refused the operator's connect code: `422 connect_code_refused`. The platform
 * failed (unreachable, timed out, 5xx, refused the request, or sent a document that does not
 * verify): `502` with a code. The state of this installation is in the way (the platform
 * revoked the connection, not connected yet): `409`. Nothing was sent because of this
 * installation's configuration: `422 no_platform_url`. The client holds a call back for its rate:
 * `429 rate_limited`.
 */
export function platformFailure(error: unknown): HttpException | null {
  if (error instanceof HttpException) return null;
  if (error instanceof ConnectCodeRefusedError) {
    return answer(422, 'connect_code_refused');
  }
  if (error instanceof ProblemError) {
    if (error.status === 401 && error.code === 'credential_revoked') {
      return answer(409, 'connection_revoked');
    }
    if (error.status === 429) return answer(502, 'platform_rate_limited');
    if (error.status >= 500) return answer(502, 'platform_unavailable');
    return answer(502, 'platform_refused');
  }
  if (error instanceof EntitlementError) {
    return answer(502, 'entitlement_unverified');
  }
  if (error instanceof KeyManifestError) {
    return answer(502, 'platform_keys_unverified');
  }
  if (error instanceof TimeoutError) return answer(502, 'platform_timeout');
  if (error instanceof ResponseTooLargeError) {
    return answer(502, 'platform_answer_too_large');
  }
  if (error instanceof EgressRefusedError) {
    // An insecure base address is this installation's configuration; a redirect or an address
    // outside the platform's origin came from the platform's side.
    return error.code === 'insecure_base_url'
      ? answer(422, 'no_platform_url')
      : answer(502, 'platform_egress_refused');
  }
  if (error instanceof RateLimitedError) return answer(429, 'rate_limited');
  if (error instanceof NotConnectedError) return answer(409, 'not_connected');
  if (isNetworkFailure(error)) return answer(502, 'platform_unreachable');
  return null;
}

/**
 * Turns a failure of Ever Platform into its answer ({@link platformFailure}) on every route of the
 * module, instead of a 500. Logs one line with the short error code (never a message of the
 * platform).
 */
@Injectable()
export class EverConnectPlatformErrorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('EverConnect');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        const mapped = platformFailure(error);
        if (!mapped) return throwError(() => error);
        this.logger.warn(
          `${context.getClass().name}.${context.getHandler().name}: Ever Platform call failed (${errorCode(error)}); answered ${mapped.getStatus()}.`,
        );
        return throwError(() => mapped);
      }),
    );
  }
}
