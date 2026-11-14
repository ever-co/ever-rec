import { toPublicLikes } from './likes';

describe('toPublicLikes', () => {
  const likes = [
    { uid: 'uid-a', timestamp: 10 },
    { uid: 'uid-b', timestamp: 20 },
  ];

  it('keeps the count and hides every uid from an anonymous viewer', () => {
    expect(toPublicLikes(likes)).toEqual([
      { uid: '', timestamp: 10 },
      { uid: '', timestamp: 20 },
    ]);
  });

  it('keeps only the viewer’s own uid', () => {
    expect(toPublicLikes(likes, 'uid-b')).toEqual([
      { uid: '', timestamp: 10 },
      { uid: 'uid-b', timestamp: 20 },
    ]);
  });

  it('does not match an empty viewer uid against a like', () => {
    expect(toPublicLikes([{ uid: '', timestamp: 1 }], '')).toEqual([
      { uid: '', timestamp: 1 },
    ]);
  });

  it('returns no likes for a legacy number, a missing value or any other shape', () => {
    for (const value of [0, 3, null, undefined, 'x', { a: 1 }, true]) {
      expect(toPublicLikes(value, 'uid-a')).toEqual([]);
    }
  });

  it('drops entries that are not likes and carries no other field', () => {
    expect(
      toPublicLikes(
        [null, 'x', 7, { timestamp: 1 }, { uid: 5 }, { uid: 'uid-a' }],
        'uid-a',
      ),
    ).toEqual([{ uid: 'uid-a', timestamp: 0 }]);
    expect(
      toPublicLikes([{ uid: 'uid-a', timestamp: 5, email: 'a@example.test' }]),
    ).toEqual([{ uid: '', timestamp: 5 }]);
  });
});
