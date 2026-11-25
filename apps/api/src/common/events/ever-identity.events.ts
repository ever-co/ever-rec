/**
 * In-process events of the Ever ID sign-in links (EventEmitter2). Emitting them sends nothing
 * anywhere: only an optional listener (the Ever Platform connection, when it is switched on and
 * `ever_id_login` is enabled) may act on them. A leaf: names and payload types only.
 */
export const EVER_IDENTITY_EVENTS = Object.freeze({
  linkCreated: 'ever.identity.link_created',
  linkRemoved: 'ever.identity.link_removed',
});

/** A Rec account was linked to, or unlinked from, an Ever ID `(issuer, subject)`. */
export interface EverIdentityLinkEvent {
  uid: string;
  issuer: string;
  subject: string;
  linkMethod: string;
}
