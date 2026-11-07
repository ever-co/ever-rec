import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error codes of the Ever ID flow.
 *
 * The callback redirects to the portal with one of the redirect codes; the JSON routes answer with
 * `{ statusCode, code, message }`.
 */
export type EverIdRedirectErrorCode =
  | 'invalid_state'
  | 'token_invalid'
  | 'email_unverified'
  | 'reauth_required'
  | 'account_exists'
  | 'signup_disabled'
  | 'provider_error';

/** Failures of token validation, mapped to `token_invalid` or `email_unverified` for the portal. */
export type EverIdTokenErrorCode =
  | 'token_invalid'
  | 'issuer_rejected'
  | 'audience_rejected'
  | 'expired'
  | 'nonce_mismatch'
  | 'email_unverified'
  | 'provider_error';

/**
 * Why a token did not verify against one accepted issuer although another accepted issuer may still
 * own it: its `iss` names another issuer, the issuer publishes no key for its `kid`, or the
 * issuer's key does not verify its signature.
 */
export type EverIdIssuerMismatch =
  | 'issuer_mismatch'
  | 'unknown_key'
  | 'bad_signature';

/** A validation or protocol failure inside the OpenID Connect client. */
export class EverIdTokenError extends Error {
  constructor(
    readonly code: EverIdTokenErrorCode,
    message: string,
    readonly mismatch?: EverIdIssuerMismatch,
  ) {
    super(message);
    this.name = 'EverIdTokenError';
  }

  /** The code the portal shows a message for. */
  get redirectCode(): EverIdRedirectErrorCode {
    switch (this.code) {
      case 'email_unverified':
        return 'email_unverified';
      case 'provider_error':
        return 'provider_error';
      default:
        return 'token_invalid';
    }
  }
}

/** A JSON error answer with a stable `code`. */
export function everIdHttpError(
  status: HttpStatus,
  code: string,
  message: string,
): HttpException {
  return new HttpException({ statusCode: status, code, message }, status);
}

export const providerDisabled = () =>
  everIdHttpError(
    HttpStatus.NOT_FOUND,
    'provider_disabled',
    'Ever ID sign-in is not enabled on this server.',
  );
