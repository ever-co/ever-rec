/**
 * A person's deletion and export requests from Ever Platform (`ever.registry.person.*_requested`):
 * the answers Ever Platform takes (an `exported` receipt needs an https `export_url`; every answer
 * but `failed` is final), each behind its own switch, decided once per job and sent again only until
 * Ever Platform recorded it.
 */
import { createHash } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { ProblemError } from '@ever-co/connect-sdk';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { readEverConnectConfig } from '../ever-connect.config';
import { EVER_CONNECT_PATHS } from '../ever-connect.types';
import {
  EverConnectPersonService,
  hashesOf,
  personExportUrl,
} from './ever-connect-person.service';

const ISSUER = 'https://auth.ever.co';
const hashOf = (subject: string) =>
  createHash('sha256').update(`${ISSUER}#${subject}`).digest('hex');

const PENDING_DELETION = {
  result: 'failed',
  detail: { reason_code: 'account_deletion_pending' },
};
const EXPORT_NOT_AVAILABLE = {
  result: 'failed',
  detail: { reason_code: 'export_not_available' },
};

function setup(env: Record<string, string> = {}) {
  const firebase = new InMemoryFirebaseApp();
  const db = firebase.db;
  const acks: any[] = [];
  const ackErrors: unknown[] = [];
  const client = {
    run: async (call: (client: any) => Promise<unknown>) =>
      call({
        instances: {
          ack: async (body: unknown) => {
            if (ackErrors.length) throw ackErrors.shift();
            acks.push(body);
          },
          personLinks: { remove: async () => undefined },
        },
      }),
  };
  const store = {
    db: () => db,
    workspace: async (id: string) =>
      (await db.ref(`workspaces/${id}`).get()).val(),
    personExport: async (jobId: string, uid: string) =>
      (
        await db.ref(`${EVER_CONNECT_PATHS.personExports}/${jobId}/${uid}`).get()
      ).val(),
    setPersonExport: async (jobId: string, uid: string, record: any) =>
      db.ref(`${EVER_CONNECT_PATHS.personExports}/${jobId}/${uid}`).set(record),
  };
  const audit = { write: jest.fn(async () => undefined) };
  const settings = {
    installSource: 'self-hosted',
    operatorUids: new Set(['uid-operator']),
    recJwtSecret: 'test-only-secret-of-this-installation-0001',
  };
  const config = readEverConnectConfig(
    { WEBSITE_URL: 'https://rec.example.test', ...env },
    () => undefined,
  );
  const deleter = {
    delete: jest.fn(async (uid: string) => {
      await db.ref(`users/${uid}`).remove();
      return true;
    }),
  };
  const service = new EverConnectPersonService(
    store as any,
    client as any,
    audit as any,
    () => Date.UTC(2026, 10, 26, 9, 0, 0),
    settings as any,
    config,
    deleter,
  );

  // A person with one Ever ID, a member (not the admin) of someone else's workspace.
  db.write(['users', 'uid-person'], {
    displayName: 'Person',
    email: 'person@example.test',
    workspaceIds: ['ws-1'],
  });
  db.write(['workspaces', 'ws-1'], {
    admin: 'uid-owner',
    name: 'Acme recordings',
    members: [{ id: 'uid-person' }],
  });
  db.write(['ever_identities', 'k1'], {
    issuer: ISSUER,
    subject: 'subject-1',
    uid: 'uid-person',
    linkMethod: 'explicit',
    linkedAt: 1,
  });
  db.write(['ever_identities_by_uid', 'uid-person', 'k1'], true);

  const request = (job: string, subject = 'subject-1') => ({
    person_id: 'p1',
    job_id: job,
    respond_by: '2026-12-01T00:00:00Z',
    subject_hashes: [hashOf(subject)],
  });
  return {
    db,
    acks,
    ackErrors,
    audit,
    deleter,
    service,
    request,
    stored: (job: string) =>
      db.dump(`${EVER_CONNECT_PATHS.personRequests}/${job}`) as any,
  };
}

describe('person request helpers', () => {
  it('reads the subject hashes of both shapes, lower-cased, each once', () => {
    const hash = hashOf('a');
    expect(
      hashesOf({
        subject_hashes: [hash.toUpperCase(), 'not-a-hash', 7],
        subject_hash: hash,
      }),
    ).toEqual([hash]);
    expect(hashesOf(null)).toEqual([]);
  });

  it('the export address is an https portal page, never anything else', () => {
    expect(personExportUrl('https://rec.example.test', 'job 1')).toBe(
      'https://rec.example.test/settings/data-export?job=job%201',
    );
    expect(personExportUrl('https://rec.example.test/portal/', 'j')).toBe(
      'https://rec.example.test/portal/settings/data-export?job=j',
    );
    expect(personExportUrl('http://rec.example.test', 'j')).toBeNull();
    expect(personExportUrl('https://user:pw@rec.example.test', 'j')).toBeNull();
    expect(personExportUrl('', 'j')).toBeNull();
  });
});

describe('a person export request', () => {
  it('switched off (the default): failed / export_not_available, and no export is made', async () => {
    const t = setup();
    await t.service.onExportRequested(t.request('job-e1'));
    expect(t.acks).toEqual([{ job_id: 'job-e1', ...EXPORT_NOT_AVAILABLE }]);
    expect(t.db.dump(EVER_CONNECT_PATHS.personExports)).toBeNull();
    expect(t.stored('job-e1')).toMatchObject({
      kind: 'export',
      result: 'failed',
      reasonCode: 'export_not_available',
      outcome: 'answered',
    });
  });

  it('switched on: exported, with the portal page where only that account downloads it', async () => {
    const t = setup({ EVER_CONNECT_PERSON_EXPORT_ENABLED: 'true' });
    await t.service.onExportRequested(t.request('job-e2'));
    expect(t.acks).toEqual([
      {
        job_id: 'job-e2',
        result: 'exported',
        export_url: 'https://rec.example.test/settings/data-export?job=job-e2',
      },
    ]);
    const own = (await t.service.download('job-e2', 'uid-person')) as any;
    expect(own.profile).toEqual({
      displayName: 'Person',
      email: 'person@example.test',
    });
    expect(own.identities.map((row: any) => row.subject)).toEqual(['subject-1']);
    await expect(t.service.download('job-e2', 'uid-other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // Stored encrypted: no e-mail address in the database.
    expect(
      JSON.stringify(t.db.dump(EVER_CONNECT_PATHS.personExports)),
    ).not.toContain('person@');
  });

  it('switched on without an https portal: failed / export_not_available', async () => {
    const t = setup({
      EVER_CONNECT_PERSON_EXPORT_ENABLED: 'true',
      WEBSITE_URL: 'http://rec.example.test',
    });
    await t.service.onExportRequested(t.request('job-e3'));
    expect(t.acks).toEqual([{ job_id: 'job-e3', ...EXPORT_NOT_AVAILABLE }]);
    expect(t.db.dump(EVER_CONNECT_PATHS.personExports)).toBeNull();
  });

  it('an Ever ID this installation does not know: no_account', async () => {
    const t = setup({ EVER_CONNECT_PERSON_EXPORT_ENABLED: 'true' });
    await t.service.onExportRequested(t.request('job-e4', 'someone-else'));
    expect(t.acks).toEqual([{ job_id: 'job-e4', result: 'no_account' }]);
  });
});

describe('a person deletion request', () => {
  it('switched off (the default): the Ever ID goes, the account stays, failed / account_deletion_pending', async () => {
    const t = setup();
    await t.service.onDeletionRequested(t.request('job-d1'));
    expect(t.acks).toEqual([{ job_id: 'job-d1', ...PENDING_DELETION }]);
    expect(t.db.dump('ever_identities/k1')).toBeNull();
    expect(t.db.dump('ever_identities_by_uid/uid-person/k1')).toBeNull();
    expect(t.db.dump('users/uid-person')).not.toBeNull();
    expect(t.deleter.delete).not.toHaveBeenCalled();
  });

  it('switched on: the account is deleted by Rec\'s own account deletion, deleted', async () => {
    const t = setup({ EVER_CONNECT_PERSON_DELETION_ENABLED: 'true' });
    await t.service.onDeletionRequested(t.request('job-d2'));
    expect(t.deleter.delete).toHaveBeenCalledWith('uid-person');
    expect(t.acks).toEqual([{ job_id: 'job-d2', result: 'deleted' }]);
    expect(t.db.dump('ever_identities/k1')).toBeNull();
  });

  it('switched on, but the account administers a workspace: kept, failed / account_deletion_pending', async () => {
    const t = setup({ EVER_CONNECT_PERSON_DELETION_ENABLED: 'true' });
    t.db.write(['workspaces', 'ws-2'], { admin: 'uid-person', name: 'Own' });
    t.db.write(['users', 'uid-person', 'workspaceIds'], ['ws-1', 'ws-2']);
    await t.service.onDeletionRequested(t.request('job-d3'));
    expect(t.deleter.delete).not.toHaveBeenCalled();
    expect(t.acks).toEqual([{ job_id: 'job-d3', ...PENDING_DELETION }]);
    expect(t.db.dump('users/uid-person')).not.toBeNull();
  });

  it('switched on, but the account operates the installation: kept', async () => {
    const t = setup({ EVER_CONNECT_PERSON_DELETION_ENABLED: 'true' });
    t.db.write(['users', 'uid-operator'], { displayName: 'Operator' });
    t.db.write(['ever_identities', 'k9'], {
      issuer: ISSUER,
      subject: 'subject-op',
      uid: 'uid-operator',
    });
    await t.service.onDeletionRequested(t.request('job-d4', 'subject-op'));
    expect(t.deleter.delete).not.toHaveBeenCalled();
    expect(t.acks).toEqual([{ job_id: 'job-d4', ...PENDING_DELETION }]);
  });

  it('switched on, and the account deletion does not complete: failed / account_deletion_pending', async () => {
    const t = setup({ EVER_CONNECT_PERSON_DELETION_ENABLED: 'true' });
    t.deleter.delete.mockResolvedValueOnce(false);
    await t.service.onDeletionRequested(t.request('job-d5'));
    expect(t.acks).toEqual([{ job_id: 'job-d5', ...PENDING_DELETION }]);
  });
});

describe('a request read again', () => {
  it('an answer that did not reach Ever Platform is sent again unchanged, though the Ever ID is gone', async () => {
    const t = setup();
    t.ackErrors.push(new ProblemError(503, 'unavailable'));
    await expect(
      t.service.onDeletionRequested(t.request('job-r1')),
    ).rejects.toBeInstanceOf(ProblemError);
    expect(t.db.dump('ever_identities/k1')).toBeNull();
    await t.service.onDeletionRequested(t.request('job-r1'));
    // Not `no_account`: the match made when the request was first read stands.
    expect(t.acks).toEqual([{ job_id: 'job-r1', ...PENDING_DELETION }]);
    await t.service.onDeletionRequested(t.request('job-r1'));
    expect(t.acks).toHaveLength(1);
    expect(t.audit.write).toHaveBeenCalledTimes(1);
  });

  it('an answer Ever Platform refuses is not sent again', async () => {
    const t = setup();
    t.ackErrors.push(new ProblemError(409, 'receipt_final'));
    await t.service.onExportRequested(t.request('job-r2'));
    expect(t.stored('job-r2').outcome).toBe('not_needed:409:receipt_final');
    await t.service.onExportRequested(t.request('job-r2'));
    expect(t.acks).toEqual([]);
  });

  it('a job id read as the other kind is ignored', async () => {
    const t = setup();
    await t.service.onExportRequested(t.request('job-r3'));
    await t.service.onDeletionRequested(t.request('job-r3'));
    expect(t.acks).toEqual([{ job_id: 'job-r3', ...EXPORT_NOT_AVAILABLE }]);
    expect(t.db.dump('ever_identities/k1')).not.toBeNull();
  });
});
