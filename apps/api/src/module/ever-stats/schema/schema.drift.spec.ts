import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface VendorFile {
  path: string;
  source: string;
  sha256: string;
  provisional: boolean;
}

const DIR = __dirname;
const vendor = JSON.parse(readFileSync(join(DIR, 'VENDOR.json'), 'utf8')) as {
  source: { repository: string; commit: string; contracts_version: string };
  files: VendorFile[];
};

const sha256 = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');

/** Every vendored JSON file under this folder, relative, with `/` separators. */
function vendoredFiles(dir = DIR, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(join(dir, name)).isDirectory()) {
      out.push(...vendoredFiles(join(dir, name), rel));
    } else if (name.endsWith('.json') && name !== 'VENDOR.json') {
      out.push(rel);
    }
  }
  return out;
}

/** The files whose bytes differ from the hashes `VENDOR.json` records. */
export function driftedFiles(
  read: (path: string) => Buffer = (p) => readFileSync(join(DIR, p)),
): string[] {
  return vendor.files
    .filter((file) => sha256(read(file.path)) !== file.sha256)
    .map((file) => file.path);
}

describe('vendored statistics contract', () => {
  it('names its public source', () => {
    expect(vendor.source.repository).toBe('ever-co/ever-connect-sdk');
    expect(vendor.source.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it('records every vendored file, none of them provisional', () => {
    expect(vendor.files.map((file) => file.path).sort()).toEqual(
      vendoredFiles(),
    );
    expect(vendor.files.filter((file) => file.provisional !== false)).toEqual(
      [],
    );
  });

  it('has the bytes VENDOR.json records (drift)', () => {
    expect(driftedFiles()).toEqual([]);
  });

  it('notices a changed byte (control)', () => {
    const changed = driftedFiles((path) => {
      const bytes = Buffer.from(readFileSync(join(DIR, path)));
      if (path === 'ever.stats.v1.json') bytes[10] = bytes[10] ^ 0x01;
      return bytes;
    });
    expect(changed).toEqual(['ever.stats.v1.json']);
  });

  it('holds the published schema (its SHA-256 on Ever Platform)', () => {
    expect(sha256(readFileSync(join(DIR, 'ever.stats.v1.json')))).toBe(
      '0cd746f7dec75117a6b812b7a832f9ceca4c97a6ecf65d22d6967a6475efc6e5',
    );
  });
});
