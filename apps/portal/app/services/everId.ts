/**
 * Helpers of the optional Ever ID sign-in (any OpenID Connect issuer the server is configured with).
 */

/** Error codes the API sends back in `ever_id_error` or in a JSON `code`, each with a message. */
export const EVER_ID_ERROR_CODES = [
  'invalid_state',
  'token_invalid',
  'email_unverified',
  'reauth_required',
  'account_exists',
  'signup_disabled',
  'provider_error',
  'pending_expired',
  'invalid_code',
  'subject_linked',
  'last_sign_in_method',
  'wrong_account',
  'rate_limited',
] as const;

export type EverIdErrorCode = (typeof EVER_ID_ERROR_CODES)[number];

export type EverIdErrorMessageKey = `page.auth.everId.errors.${EverIdErrorCode | 'generic'}`;

/** The translation key of the message for an error code (unknown codes get a generic message). */
export const everIdErrorMessageKey = (code: unknown): EverIdErrorMessageKey =>
  typeof code === 'string' && (EVER_ID_ERROR_CODES as readonly string[]).includes(code)
    ? (`page.auth.everId.errors.${code}` as EverIdErrorMessageKey)
    : 'page.auth.everId.errors.generic';

/** The `code` of an API error answer, if any. */
export const everIdErrorCode = (error: any): string | undefined =>
  error?.response?.data?.code ?? error?.code ?? undefined;

const MAX_RETURN_LENGTH = 512;

/**
 * A relative portal path to go to after sign-in, or `null`. Mirrors the server's rule: one leading
 * `/`, no scheme, no `//`, no backslash, no `@`.
 */
export const safeReturnPath = (value: unknown): string | null =>
  typeof value === 'string' &&
  value.length <= MAX_RETURN_LENGTH &&
  /^\/(?![/\\])[A-Za-z0-9\-._~/?=&%+,;!*()]*$/.test(value)
    ? value
    : null;

/**
 * The return path for a sign-in started on the login or register page: the page's own query (minus
 * the Ever ID parameters) is kept so the usual post-login redirect (extension, invitations, shared
 * items) still applies.
 */
export const everIdReturnPath = (pathname: string, query: Record<string, string | string[] | undefined>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === 'ever_id' || key === 'ever_id_error' || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, item);
    }
  }
  const search = params.toString();
  const candidate = search ? `${pathname}?${search}` : pathname;
  return safeReturnPath(candidate) ?? pathname;
};

/** The query of a return path, as a router query object. */
export const returnPathQuery = (returnPath: string): Record<string, string> => {
  const url = new URL(returnPath, 'https://portal.invalid');
  return Object.fromEntries(url.searchParams.entries());
};
