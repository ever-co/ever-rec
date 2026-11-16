/**
 * A small in-memory stand-in for the parts of the Realtime Database admin API that the OAuth state
 * and the integration callbacks use (`get`, `set`, `update`, `remove`, `transaction`). It is for
 * unit tests only; it is loaded from `jest.mock` factories.
 */
export interface FakeRealtimeDb {
  /** The whole tree. Tests read and seed it directly. */
  data: Record<string, any>;
  /** Every path that was written to or removed, in order. */
  writes: string[];
  admin: { database: () => { ref: (path: string) => any } };
}

const segments = (path: string) => path.split('/').filter(Boolean);

export function createFakeRealtimeDb(): FakeRealtimeDb {
  const db: FakeRealtimeDb = {
    data: {},
    writes: [],
    admin: undefined as any,
  };

  const read = (path: string) => {
    let value: any = db.data;
    for (const segment of segments(path)) {
      value = value?.[segment];
    }
    return value === undefined ? null : value;
  };

  const write = (path: string, value: any) => {
    const parts = segments(path);
    db.writes.push(parts.join('/'));
    let node = db.data;
    for (const part of parts.slice(0, -1)) {
      if (node[part] === null || typeof node[part] !== 'object') {
        node[part] = {};
      }
      node = node[part];
    }
    const last = parts[parts.length - 1];
    if (value === null || value === undefined) {
      delete node[last];
    } else {
      node[last] = JSON.parse(JSON.stringify(value));
    }
  };

  const makeRef = (path: string): any => ({
    get: async () => {
      const value = read(path);
      return {
        val: () => (value === null ? null : JSON.parse(JSON.stringify(value))),
        exists: () => value !== null,
      };
    },
    set: async (value: any) => write(path, value),
    remove: async () => write(path, null),
    update: async (values: Record<string, any>) => {
      for (const [key, value] of Object.entries(values)) {
        write(`${path}/${key}`, value);
      }
    },
    // The update function runs against the current value and nothing happens in between.
    transaction: async (update: (current: any) => any) => {
      // Yield first so that two callers really are in flight together.
      await Promise.resolve();
      const current = read(path);
      const next = update(
        current === null ? null : JSON.parse(JSON.stringify(current)),
      );
      if (next === undefined) {
        return { committed: false };
      }
      write(path, next);
      return { committed: true };
    },
  });

  db.admin = { database: () => ({ ref: makeRef }) };
  return db;
}
