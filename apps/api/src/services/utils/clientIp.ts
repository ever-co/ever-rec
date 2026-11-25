/**
 * The address of the caller, read from the request itself: the first hop of `x-forwarded-for`
 * when a proxy set one, else the address of the connection.
 *
 * It is used to tell anonymous viewers apart for the view counter, nothing more. Behind a proxy
 * that does not overwrite `x-forwarded-for`, a caller can pick the address it is counted under.
 */
export const getClientIp = (request: any): string | null => {
  const forwarded = request?.headers?.['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  if (typeof first === 'string' && first.trim()) {
    return first.split(',')[0].trim();
  }

  return request?.ip ?? request?.socket?.remoteAddress ?? null;
};
