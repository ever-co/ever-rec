/**
 * `TokenStorageService.update` must never write back an entry that a logout deleted while the refresh was
 * running. It is one Realtime Database transaction: the first attempt may see the local cache (null) and
 * answers null, which the server rejects while the entry exists and accepts as a no-op once it is gone.
 *
 * The transaction below follows those server rules step by step, so the race (delete after the first
 * attempt, before the server compares) is reproduced deterministically.
 */
import { NotFoundException } from '@nestjs/common';
import { IToken, TokenStorageService } from './token-storage.service';

type Update = (current: IToken | null) => IToken | null | undefined;

/** One stored value and a transaction that runs `update` like the SDK and the server would. */
const fakeDatabase = (initial: IToken | null) => {
  const state = { value: initial, applyLocally: undefined as boolean | undefined };
  let beforeServerCompare: () => void = () => undefined;

  const ref = {
    async transaction(update: Update, _onComplete?: unknown, applyLocally?: boolean) {
      state.applyLocally = applyLocally;
      // Attempt 1: the empty local cache.
      let proposal = update(null);
      beforeServerCompare();
      // The server accepts an attempt only when it was computed from the stored value; otherwise it
      // reruns `update` with that value.
      if (state.value !== null) {
        proposal = update({ ...state.value });
      }
      if (proposal === undefined) {
        return { committed: false, snapshot: snapshotOf(state.value) };
      }
      state.value = proposal;
      return { committed: true, snapshot: snapshotOf(state.value) };
    },
  };

  const service = new TokenStorageService({
    getDatabase: () => ({ ref: () => ref }),
  } as any);

  return {
    service,
    state,
    /** Runs between the first attempt and the server's comparison (a concurrent logout). */
    onBeforeServerCompare: (fn: () => void) => {
      beforeServerCompare = fn;
    },
  };
};

const snapshotOf = (value: IToken | null) => ({
  exists: () => value !== null,
  val: () => value,
});

const stored = (): IToken => ({
  id: 'session-1',
  token: 'old-serialized',
  createdAt: 1,
  updatedAt: 1,
});

describe('TokenStorageService.update', () => {
  it('writes the new token into an existing entry and keeps the rest', async () => {
    const { service, state } = fakeDatabase(stored());

    const result = await service.update('session-1', 'new-serialized');

    expect(result.token).toBe('new-serialized');
    expect(result.createdAt).toBe(1);
    expect(state.value?.token).toBe('new-serialized');
  });

  it('never recreates an entry deleted after the first attempt (logout racing a refresh)', async () => {
    const { service, state, onBeforeServerCompare } = fakeDatabase(stored());
    onBeforeServerCompare(() => {
      state.value = null; // the back-channel logout removes the session meanwhile
    });

    await expect(service.update('session-1', 'new-serialized')).rejects.toBeInstanceOf(NotFoundException);
    expect(state.value).toBeNull();
  });

  it('throws NotFound and creates nothing when the entry is already gone', async () => {
    const { service, state } = fakeDatabase(null);

    await expect(service.update('session-1', 'new-serialized')).rejects.toBeInstanceOf(NotFoundException);
    expect(state.value).toBeNull();
  });

  it('keeps intermediate transaction values out of local reads (applyLocally=false)', async () => {
    const { service, state } = fakeDatabase(stored());

    await service.update('session-1', 'new-serialized');

    expect(state.applyLocally).toBe(false);
  });
});
