/**
 * Ties an Ever ID sign-in to the portal tab that started it.
 *
 * Before the browser leaves for the sign-in, the tab stores a random value in its session storage
 * and the API receives only its SHA-256. The API then redeems the sign-in's one-time code (and a
 * sign-up confirmation) only together with that value, so a portal link that is forwarded to
 * another browser cannot sign anyone in.
 */

const STORAGE_KEY = 'ever-id.binding';

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

/** SHA-256 of bytes (FIPS 180-4). Synchronous, so it works outside secure contexts too. */
const sha256 = (bytes: number[]): number[] => {
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const bitLength = bytes.length * 8;
  const data = [...bytes, 0x80];
  while (data.length % 64 !== 56) data.push(0);
  for (let i = 7; i >= 0; i--) data.push(Math.floor(bitLength / 2 ** (i * 8)) & 0xff);

  const w = new Array<number>(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = ((data[j] << 24) | (data[j + 1] << 16) | (data[j + 2] << 8) | data[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, k] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      k = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, k].forEach((value, i) => (h[i] = (h[i] + value) >>> 0));
  }
  return h.flatMap((value) => [value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
};

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** base64url without padding. */
const base64url = (bytes: number[]): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = [(n >> 18) & 63, (n >> 12) & 63, (n >> 6) & 63, n & 63].map((c) => BASE64URL[c]);
    out += chars.slice(0, Math.ceil(((Math.min(3, bytes.length - i)) * 8) / 6)).join('');
  }
  return out;
};

/** base64url SHA-256 of an ASCII string (the stored value is base64url, so ASCII). */
export const hashEverIdBinding = (value: string): string =>
  base64url(sha256(Array.from(value, (char) => char.charCodeAt(0) & 0xff)));

const storage = (): Storage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/** Creates and stores a new binding for this tab; returns its hash for the API. */
export const createEverIdBinding = (): string => {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  const value = base64url(Array.from(bytes));
  storage()?.setItem(STORAGE_KEY, value);
  return hashEverIdBinding(value);
};

/** The binding this tab stored when it started a sign-in, if any. */
export const readEverIdBinding = (): string | undefined => storage()?.getItem(STORAGE_KEY) ?? undefined;

export const clearEverIdBinding = (): void => {
  storage()?.removeItem(STORAGE_KEY);
};
