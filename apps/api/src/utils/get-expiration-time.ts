/**
 * Compute an absolute expiration Date from a relative duration in seconds.
 *
 * @param expiresIn Number of seconds until expiration (number or numeric string).
 * @returns Date representing now + expiresIn seconds.
 * @throws TypeError if the input is blank or whitespace.
 * @throws RangeError if the value is not finite or is negative.
 */
export function getExpirationTime(expiresIn: number | string): Date {
  // Reject blank/whitespace string input
  if (typeof expiresIn === 'string' && expiresIn.trim() === '') {
    throw new TypeError('expiresIn cannot be blank or whitespace');
  }

  const parsed = Number(expiresIn);

  // Reject NaN, Infinity, -Infinity
  if (!Number.isFinite(parsed)) {
    throw new RangeError('expiresIn must be a finite number');
  }

  // Reject negative values
  if (parsed < 0) {
    throw new RangeError('expiresIn cannot be negative');
  }

  const expiresInMs = parsed * 1000;
  return new Date(Date.now() + expiresInMs);
}
