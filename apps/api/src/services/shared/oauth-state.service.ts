import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { createHash, timingSafeEqual } from 'crypto';
import { nanoid } from 'nanoid';

export type OAuthStateProvider = 'slack' | 'jira' | 'dropbox' | 'drive';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const NONCE_LENGTH = 32;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{32}$/;

const hashBinding = (binding: string) =>
  createHash('sha256').update(binding).digest('hex');

/** A secret for the browser that starts a connection. It is kept in a cookie, never in a URL. */
export const newOAuthBinding = () => nanoid(NONCE_LENGTH);

export const oauthBindingCookieName = (provider: OAuthStateProvider) =>
  `ever_rec_oauth_${provider}`;

/**
 * Puts the binding secret in an HttpOnly cookie on the API. The callback is a top level GET from
 * the provider, so the cookie is sent with it. Over https the cookie is `SameSite=None; Secure`, so
 * that it can also be set by the request the web app makes from another origin; on plain http (local
 * development) it is `Lax`.
 */
export function setOAuthBindingCookie(
  res: { cookie: (name: string, value: string, options: any) => unknown },
  provider: OAuthStateProvider,
  binding: string,
  apiBaseUrl?: string,
) {
  const secure = /^https:/i.test(apiBaseUrl ?? '');
  res.cookie(oauthBindingCookieName(provider), binding, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: OAUTH_STATE_TTL_MS,
    path: '/api/v1',
  });
}

/** The binding secret the browser sent back, or undefined. */
export function readOAuthBinding(
  req: { headers?: Record<string, any> } | undefined,
  provider: OAuthStateProvider,
): string | undefined {
  const header = req?.headers?.cookie;
  if (typeof header !== 'string') {
    return undefined;
  }
  const name = `${oauthBindingCookieName(provider)}=`;
  for (const part of header.split(';')) {
    const item = part.trim();
    if (item.startsWith(name)) {
      return item.slice(name.length);
    }
  }
  return undefined;
}

/**
 * One-time `state` values for the OAuth redirects. The nonce says nothing about the user: the user
 * id lives only in the server side record. The record also holds a hash of a secret that only the
 * browser which asked for the connection has (in a cookie), so a Connect link passed to somebody
 * else does not work for them, and a callback can only be completed by that browser, once, within
 * ten minutes.
 */
@Injectable()
export class OAuthStateService {
  async issue(
    uid: string,
    provider: OAuthStateProvider,
    binding: string,
  ): Promise<string> {
    const nonce = nanoid(NONCE_LENGTH);
    await admin
      .database()
      .ref(`oauthStates/${nonce}`)
      .set({
        uid,
        provider,
        bindingHash: hashBinding(binding),
        expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
      });
    return nonce;
  }

  /**
   * Returns the uid the nonce was issued for, or null when it is malformed, unknown, already used,
   * issued for another provider, expired, or not presented by the browser it was issued to. The
   * record is removed in the same step that reads it, so two callbacks with the same nonce cannot
   * both succeed. A record that does not match is removed as well.
   */
  async consume(
    nonce: unknown,
    provider: OAuthStateProvider,
    binding: unknown,
  ): Promise<string | null> {
    // The nonce becomes a database path segment: only the exact shape we issue is let through.
    if (typeof nonce !== 'string' || !NONCE_PATTERN.test(nonce)) {
      return null;
    }
    // Without the browser secret the record is left alone: the person who holds only the link
    // must not be able to burn it.
    if (typeof binding !== 'string' || !binding) {
      return null;
    }

    let claimed: any = null;
    try {
      await admin
        .database()
        .ref(`oauthStates/${nonce}`)
        .transaction((current) => {
          // The update function can run again with newer data: the last call sees the value
          // that is really removed.
          claimed = current ?? null;
          return null;
        });
    } catch (e) {
      return null;
    }

    if (
      !claimed ||
      typeof claimed.uid !== 'string' ||
      !claimed.uid ||
      claimed.provider !== provider ||
      typeof claimed.expiresAt !== 'number' ||
      claimed.expiresAt <= Date.now() ||
      typeof claimed.bindingHash !== 'string'
    ) {
      return null;
    }

    const expected = Buffer.from(claimed.bindingHash, 'utf8');
    const actual = Buffer.from(hashBinding(binding), 'utf8');
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return null;
    }
    return claimed.uid;
  }
}
