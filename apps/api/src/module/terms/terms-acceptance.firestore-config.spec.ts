/**
 * The Firestore configuration in the repository matches what the terms recorder needs (ever-rec#284).
 *
 * On 2026-11-27 production answered 500 on `GET /terms/status` because the composite index for the Firebase
 * adapter's query did not exist. The in-memory adapter and the emulators do not enforce indexes, so this spec runs
 * the real adapter against a recording Firestore and checks that every ordered query it sends has an index in
 * `firestore.indexes.json`, and that `firestore.rules` is the package's `FIRESTORE_RULES`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIRESTORE_RULES } from 'terms-acceptance/firebase';
import { TermsAcceptanceService } from './terms-acceptance.service';

const REPO = join(__dirname, '..', '..', '..', '..', '..');
const read = (file: string) =>
  readFileSync(join(REPO, file), 'utf8').replace(/\r\n/g, '\n');

interface SentQuery {
  collection: string;
  where: string[];
  orderBy: Array<[string, string]>;
}

/** Enough of Firestore for the adapter's reads; records each query it runs. */
const recordingFirestore = (sent: SentQuery[]) => {
  const query = (q: SentQuery): any => ({
    where: (field: string) => query({ ...q, where: [...q.where, field] }),
    orderBy: (field: string, direction = 'asc') =>
      query({ ...q, orderBy: [...q.orderBy, [field, direction]] }),
    get: async () => {
      sent.push(q);
      return { docs: [], empty: true, size: 0 };
    },
  });
  return {
    collection: (name: string) =>
      query({ collection: name, where: [], orderBy: [] }),
  };
};

interface IndexField {
  fieldPath: string;
  order?: 'ASCENDING' | 'DESCENDING';
}
const indexes: Array<{ collectionGroup: string; fields: IndexField[] }> =
  JSON.parse(read('firestore.indexes.json')).indexes;

/** An index serves the query when it holds the equality fields (any order) followed by the ordered fields. */
const covers = (
  index: { collectionGroup: string; fields: IndexField[] },
  q: SentQuery,
) => {
  if (index.collectionGroup !== q.collection) return false;
  const equality = index.fields
    .slice(0, q.where.length)
    .map((f) => f.fieldPath);
  const ordered = index.fields
    .slice(q.where.length)
    .map((f) => [f.fieldPath, f.order]);
  return (
    index.fields.length === q.where.length + q.orderBy.length &&
    [...equality].sort().join() === [...q.where].sort().join() &&
    JSON.stringify(ordered) ===
      JSON.stringify(
        q.orderBy.map(([f, d]) => [
          f,
          d === 'desc' ? 'DESCENDING' : 'ASCENDING',
        ]),
      )
  );
};

describe('Firestore configuration for terms acceptances', () => {
  it('has an index for every ordered query the recorder sends', async () => {
    const sent: SentQuery[] = [];
    const service = new TermsAcceptanceService({
      firestore: () => recordingFirestore(sent),
    } as any);

    await service.status('uid-1', 'en'); // the sign-in gate
    await service.history('uid-1');

    expect(sent.length).toBeGreaterThanOrEqual(2);
    for (const q of sent.filter((s) => s.orderBy.length)) {
      expect({ query: q, covered: indexes.some((i) => covers(i, q)) }).toEqual({
        query: q,
        covered: true,
      });
    }
  });

  it('deploys the package rules for the collection', () => {
    expect(read('firestore.rules').trim()).toBe(FIRESTORE_RULES.trim());
  });

  it('points firebase.json at both files', () => {
    expect(JSON.parse(read('firebase.json')).firestore).toEqual({
      rules: 'firestore.rules',
      indexes: 'firestore.indexes.json',
    });
  });
});
