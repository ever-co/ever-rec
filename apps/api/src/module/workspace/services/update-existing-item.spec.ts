import { updateExistingItem } from './update-existing-item';

// A reference holding `record` (null = no record). Like the real one, the transaction's first run
// sees `null` as a guess when `firstGuessNull` is set, then retries with the stored value.
function fakeRef(record: any, firstGuessNull = false) {
  const state = { record };
  return {
    state,
    transaction: async (update: (current: any) => any) => {
      if (firstGuessNull && state.record !== null) {
        // The guess is `null`, which differs from the stored record: the write is rejected
        // and the update function runs again with the real value.
        update(null);
      }
      const next = update(state.record);
      state.record = next;
      return { committed: true, snapshot: { exists: () => next !== null } };
    },
  };
}

describe('updateExistingItem', () => {
  it('merges the fields into an existing record and keeps the others', async () => {
    const ref = fakeRef({ id: 'a', title: 'old', parentId: 'f1' });
    expect(await updateExistingItem(ref, { title: 'new' })).toBe(true);
    expect(ref.state.record).toEqual({ id: 'a', title: 'new', parentId: 'f1' });
  });

  it('still updates a record when the first run guesses null', async () => {
    const ref = fakeRef({ id: 'a', title: 'old' }, true);
    expect(await updateExistingItem(ref, { title: 'new' })).toBe(true);
    expect(ref.state.record).toEqual({ id: 'a', title: 'new' });
  });

  it('returns false and creates nothing for a missing record', async () => {
    const ref = fakeRef(null);
    expect(
      await updateExistingItem(ref, { title: 'x', parentId: 'f1', originalImage: 'y' }),
    ).toBe(false);
    expect(ref.state.record).toBeNull();
  });
});
