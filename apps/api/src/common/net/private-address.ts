/** Loopback, private (RFC 1918, RFC 4193) and link-local addresses. */
export function isPrivateAddress(address: string): boolean {
  if (address === '::1' || address.startsWith('127.')) return true;
  if (/^10\./.test(address) || /^192\.168\./.test(address)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return true;
  if (/^169\.254\./.test(address)) return true;
  return /^f[cd][0-9a-f]{2}:/i.test(address) || /^fe80:/i.test(address);
}
