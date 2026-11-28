import { mapWithLimit } from './map-with-limit';

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('mapWithLimit', () => {
  it('keeps the order of the items', async () => {
    const delays = [3, 1, 2, 0];
    const out = await mapWithLimit(delays, 2, async (d, i) => {
      for (let n = 0; n < d; n++) await tick();
      return `${i}:${d}`;
    });

    expect(out).toEqual(['0:3', '1:1', '2:2', '3:0']);
  });

  it('never runs more than `limit` calls at once', async () => {
    let running = 0;
    let peak = 0;
    await mapWithLimit(
      Array.from({ length: 25 }, (_, i) => i),
      4,
      async () => {
        running++;
        peak = Math.max(peak, running);
        await tick();
        running--;
      },
    );

    expect(peak).toBe(4);
  });

  it('handles no items and a limit larger than the list', async () => {
    await expect(mapWithLimit([], 10, async () => 1)).resolves.toEqual([]);
    await expect(mapWithLimit([1, 2], 10, async (n) => n * 2)).resolves.toEqual(
      [2, 4],
    );
  });

  it('rejects with the first failure and starts no new call after it', async () => {
    const started: number[] = [];
    const failure = new Error('boom');

    await expect(
      mapWithLimit([0, 1, 2, 3, 4, 5], 2, async (n) => {
        started.push(n);
        await tick();
        if (n === 1) throw failure;
        return n;
      }),
    ).rejects.toBe(failure);
    // Limit 2: 0 and 1 start; 0 finishes and its worker starts 2; then 1 fails. Nothing starts after that.
    expect(started).toEqual([0, 1, 2]);
  });

  it('refuses a limit that is not a positive integer', async () => {
    await expect(mapWithLimit([1], 0, async (n) => n)).rejects.toBeInstanceOf(
      RangeError,
    );
    await expect(mapWithLimit([1], 1.5, async (n) => n)).rejects.toBeInstanceOf(
      RangeError,
    );
  });
});
