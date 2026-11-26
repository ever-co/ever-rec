import type { Request } from 'express';

/**
 * First hop of `x-forwarded-for`, else the socket address.
 *
 * Only ever handed to `TermsAcceptanceService`, which hashes it with a
 * per-deployment salt. A spoofed `x-forwarded-for` therefore corrupts one
 * non-authoritative field of an audit row and nothing else.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request?.headers?.['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  if (typeof first === 'string' && first.trim()) {
    return first.split(',')[0].trim();
  }

  return request?.ip ?? null;
}
