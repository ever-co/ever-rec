import type { Request } from 'express';
import { isPrivateAddress } from '../../common/net/private-address';

/**
 * The caller's address for the terms-acceptance audit row.
 *
 * `x-forwarded-for` is honoured only when the request comes from a private or
 * loopback peer (the ingress in front of the API), and then its first hop, the
 * client that proxy saw. From any other peer the header is the caller's own
 * claim, so the socket address is used instead.
 *
 * `request.ip` is not used for the forwarded case on purpose: Express `trust proxy`
 * is not configured in this API, so `request.ip` is the ingress address. The
 * private-peer rule here is the same one the Ever ID rate-limit guard applies.
 * If `trust proxy` is ever enabled, revisit this helper and the guard together.
 *
 * Only ever handed to `TermsAcceptanceService`, which hashes it with a
 * per-deployment salt; no authorization decision reads it.
 */
export function getClientIp(request: Request): string | null {
  const peer = (request?.socket?.remoteAddress ?? request?.ip ?? '').replace(
    /^::ffff:/,
    '',
  );
  const forwarded = request?.headers?.['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim();

  if (first && peer && isPrivateAddress(peer)) {
    return first.replace(/^::ffff:/, '');
  }

  return peer || null;
}
