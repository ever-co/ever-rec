/** The characters a Realtime Database key must not hold, besides the control characters. */
const FORBIDDEN = /[.#$[\]/]/;

/**
 * A Realtime Database key: not empty, at most 128 characters, no `.`, `#`, `$`, `[`, `]` or `/`,
 * and no control character (U+0000 to U+001F, U+007F).
 */
export function isDbKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    !FORBIDDEN.test(value) &&
    !hasControlCharacter(value)
  );
}

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}
