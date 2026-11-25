/**
 * In-process events (EventEmitter2) of an account's life. Nothing is sent anywhere.
 *
 * This file is a leaf: it imports nothing, so the auth module can emit these without depending on
 * the modules that handle them (the Ever ID module imports the auth module, not the other way).
 */

export const ACCOUNT_EVENTS = Object.freeze({
  /**
   * The sign-in account is gone. Emitted with `emitAsync` and awaited during the deletion, so each
   * handler removes what its module keeps for the account before the deletion answers. A handler
   * logs its own failures: they do not fail the deletion.
   */
  deleted: 'account.deleted',
});

/** `account.deleted`: the account that was deleted. */
export interface AccountDeletedEvent {
  uid: string;
}
