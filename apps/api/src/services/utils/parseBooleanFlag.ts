/**
 * Reads a flag that arrives as text in a query string (or as a real boolean in a JSON body).
 * Only `true` and `'true'` are true: `'false'`, `'0'`, an empty string, an array or a missing
 * value are all false, so a flag spelled `false` never switches a feature on.
 */
export const parseBooleanFlag = (value: unknown): boolean =>
  value === true || value === 'true';
