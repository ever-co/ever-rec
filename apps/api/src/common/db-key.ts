/** A Realtime Database key: no `.`, `#`, `$`, `[`, `]` or `/`, and not empty. */
export function isDbKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    !/[.#$[\]/\u0000-\u001f\u007f]/.test(value)
  );
}
