import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { nanoid } from 'nanoid';

export type OAuthStateProvider = 'slack' | 'jira' | 'dropbox';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const NONCE_LENGTH = 32;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/**
 * One-time `state` values for the OAuth redirects. The nonce says nothing about the user: the user
 * id lives only in the server side record, so a callback can only be completed by the browser
 * that started the flow, once, within ten minutes.
 */
@Injectable()
export class OAuthStateService {
  async issue(uid: string, provider: OAuthStateProvider): Promise<string> {
    const nonce = nanoid(NONCE_LENGTH);
    await admin
      .database()
      .ref(`oauthStates/${nonce}`)
      .set({ uid, provider, expiresAt: Date.now() + OAUTH_STATE_TTL_MS });
    return nonce;
  }

  /**
   * Returns the uid the nonce was issued for, or null when it is malformed, unknown, already used,
   * issued for another provider or expired. The record is removed in the same step that reads it,
   * so two callbacks with the same nonce cannot both succeed. A record that does not match is
   * removed as well.
   */
  async consume(
    nonce: unknown,
    provider: OAuthStateProvider,
  ): Promise<string | null> {
    // The nonce becomes a database path segment: only the exact shape we issue is let through.
    if (typeof nonce !== 'string' || !NONCE_PATTERN.test(nonce)) {
      return null;
    }

    let claimed: any = null;
    try {
      await admin
        .database()
        .ref(`oauthStates/${nonce}`)
        .transaction((current) => {
          // The last call sees the value that is really removed.
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
      claimed.expiresAt <= Date.now()
    ) {
      return null;
    }
    return claimed.uid;
  }
}
