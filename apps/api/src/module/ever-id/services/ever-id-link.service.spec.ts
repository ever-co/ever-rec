import { createHash } from 'crypto';
import { InMemoryDatabase } from '../../../../test/support/in-memory-firebase';
import {
  EverIdLinkService,
  EverIdSubjectLinkedError,
} from './ever-id-link.service';

describe('EverIdLinkService', () => {
  let db: InMemoryDatabase;
  let links: EverIdLinkService;

  beforeEach(() => {
    db = new InMemoryDatabase();
    const firebaseAdmin = {
      getDatabase: () => db,
      getDatabaseRef: (path: string) => db.ref(path),
    };
    links = new EverIdLinkService(firebaseAdmin as any);
  });

  it('keys a link by the SHA-256 of issuer, NUL and subject', () => {
    const expected = createHash('sha256')
      .update('https://idp.example.test\u0000subject-1')
      .digest('hex');
    expect(links.key('https://idp.example.test', 'subject-1')).toBe(expected);
  });

  it('writes, resolves and lists a link without any token', async () => {
    await links.link({
      issuer: 'https://idp.example.test',
      subject: 'subject-1',
      uid: 'uid-1',
      emailAtLink: 'person@example.test',
      linkMethod: 'explicit',
      everPersonId: 'person-1',
    });

    const key = links.key('https://idp.example.test', 'subject-1');
    expect(db.dump(`ever_identities/${key}`)).toMatchObject({
      issuer: 'https://idp.example.test',
      subject: 'subject-1',
      uid: 'uid-1',
      linkMethod: 'explicit',
      everPersonId: 'person-1',
    });
    expect(db.dump(`ever_identities_by_uid/uid-1/${key}`)).toBe(true);
    expect(JSON.stringify(db.dump())).not.toMatch(/token/i);

    await expect(
      links.resolve('https://idp.example.test', 'subject-1'),
    ).resolves.toMatchObject({ uid: 'uid-1' });
    await expect(links.listForUser('uid-1')).resolves.toEqual([
      expect.objectContaining({
        issuer: 'https://idp.example.test',
        subject: 'subject-1',
        email: 'person@example.test',
      }),
    ]);
  });

  it('keeps one subject on one account', async () => {
    const input = {
      issuer: 'https://idp.example.test',
      subject: 's',
      emailAtLink: 'a@example.test',
      linkMethod: 'explicit' as const,
    };
    await links.link({ ...input, uid: 'uid-1' });
    await expect(links.link({ ...input, uid: 'uid-2' })).rejects.toBeInstanceOf(
      EverIdSubjectLinkedError,
    );
    await expect(
      links.resolve(input.issuer, input.subject),
    ).resolves.toMatchObject({ uid: 'uid-1' });
    await expect(links.listForUser('uid-2')).resolves.toEqual([]);
  });

  it('records sign-ins', async () => {
    await links.link({
      issuer: 'i',
      subject: 's',
      uid: 'u',
      emailAtLink: 'a@example.test',
      linkMethod: 'jit',
    });
    expect((await links.resolve('i', 's'))!.lastLoginAt ?? null).toBeNull();
    await links.touch('i', 's');
    expect((await links.resolve('i', 's'))!.lastLoginAt).toEqual(
      expect.any(Number),
    );
  });

  it('removes only the caller’s own link', async () => {
    await links.link({
      issuer: 'i',
      subject: 's',
      uid: 'u',
      emailAtLink: 'a@example.test',
      linkMethod: 'jit',
    });
    await expect(links.unlink('someone-else', 'i', 's')).resolves.toBe(false);
    await expect(links.unlink('u', 'i', 's')).resolves.toBe(true);
    await expect(links.resolve('i', 's')).resolves.toBeNull();
    expect(db.dump('ever_identities_by_uid/u')).toBeNull();
  });
});
