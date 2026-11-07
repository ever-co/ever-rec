import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Source files of the provider (tests excluded). */
function sources(): Array<{ file: string; text: string }> {
  const roots = [__dirname];
  const extra = [
    join(
      __dirname,
      '..',
      'auth',
      'services',
      'login',
      'state',
      'ever-id-login.state.ts',
    ),
    join(
      __dirname,
      '..',
      'auth',
      'services',
      'login',
      'state',
      'gauzy-ever-id-login.state.ts',
    ),
  ];
  const files: string[] = [...extra];
  while (roots.length) {
    const dir = roots.pop()!;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        roots.push(path);
      } else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
        files.push(path);
      }
    }
  }
  return files.map((file) => ({ file, text: readFileSync(file, 'utf8') }));
}

describe('Ever ID provider source rules', () => {
  const files = sources();

  it('finds the provider sources', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('never decodes a token without verifying it', () => {
    const forbidden =
      /jwt\.decode\(|jwtService\.decode\(|jwt-decode|jwt_decode|decodeJwt\(|decodeProtectedHeader\(/;
    const offenders = files
      .filter(({ text }) => forbidden.test(text))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it('verifies tokens with the issuer key set only', () => {
    const oidc = files.find(({ file }) =>
      file.endsWith('ever-id-oidc.service.ts'),
    )!;
    expect(oidc.text).toContain('jwtVerify(');
    expect(oidc.text).toContain('algorithms: [...EVER_ID_SIGNING_ALGORITHMS]');
  });

  it('never sends a login hint or an organization scope', () => {
    const offenders = files
      .filter(({ text }) => /login_hint|urn:zitadel:iam:org:id:/.test(text))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it('never writes a token, secret, verifier or e-mail address into a log line', () => {
    const logLine = /this\.logger\.\w+\(([^;]*)\);/g;
    const sensitive = /\$\{[^}]*(token|secret|verifier|email|password)[^}]*\}/i;
    const offenders: string[] = [];
    for (const { file, text } of files) {
      for (const match of text.matchAll(logLine)) {
        if (sensitive.test(match[1])) {
          offenders.push(`${file}: ${match[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('never stores an Ever ID token on the session', () => {
    const state = files.find(({ file }) =>
      file.endsWith('ever-id-login.state.ts'),
    )!;
    expect(state.text).toMatch(/accessToken: '',\s*refreshToken: '',/);
  });
});
