/**
 * Moving a folder (with its subfolders and items) under another folder or to the top level.
 */
import { IWorkspaceFolder } from '../Interfaces/Folders';
import { planFolderMove } from './folder-move';

const folder = (
  id: string,
  parentId: string | false,
  nestLevel: number,
  items: number,
): IWorkspaceFolder =>
  ({
    id,
    name: id,
    parentId,
    nestLevel,
    items,
    updated: 'old',
  }) as unknown as IWorkspaceFolder;

// A (3 items) > A1 (2) > A1a (1);  B (0);  C (5) > C1 (5)
const tree = () => [
  folder('A', false, 0, 3),
  folder('A1', 'A', 1, 2),
  folder('A1a', 'A1', 2, 1),
  folder('B', false, 0, 0),
  folder('C', false, 0, 5),
  folder('C1', 'C', 1, 5),
];

const NOW = '2030-01-01T00:00:00.000Z';

function moved(folderId: string, to: string | false) {
  const plan = planFolderMove(tree(), folderId, to, NOW);
  expect(plan.ok).toBe(true);
  const byId = Object.fromEntries(plan.folders.map((x) => [x.id, x]));
  return { plan, byId };
}

describe('planFolderMove', () => {
  it('moves a folder with its subfolders under another folder and fixes their levels', () => {
    const { plan, byId } = moved('C', 'B');
    expect(plan.changed).toBe(true);
    expect(byId.C).toMatchObject({ parentId: 'B', nestLevel: 1, updated: NOW });
    expect(byId.C1).toMatchObject({ parentId: 'C', nestLevel: 2 });
    expect(byId.C1.updated).toBe('old');
  });

  it('moves the item count of the folder from the old folders above it to the new ones', () => {
    const { byId } = moved('C', 'B');
    expect(byId.B.items).toBe(5);
    expect(byId.C.items).toBe(5);

    const second = moved('A1a', 'B');
    expect(second.byId.A1.items).toBe(1);
    expect(second.byId.A.items).toBe(2);
    expect(second.byId.B.items).toBe(1);
    expect(second.byId.A1a).toMatchObject({ parentId: 'B', nestLevel: 1 });
  });

  it('moves a subfolder to the top level', () => {
    const { byId } = moved('C1', false);
    expect(byId.C1).toMatchObject({ parentId: false, nestLevel: 0 });
    expect(byId.C.items).toBe(0);
  });

  it('leaves the count of a folder above both the old and the new place as it is', () => {
    const { byId } = moved('A1a', 'A');
    expect(byId.A.items).toBe(3);
    expect(byId.A1.items).toBe(1);
    expect(byId.A1a).toMatchObject({ parentId: 'A', nestLevel: 1 });
  });

  it('changes nothing else and does not touch the list it was given', () => {
    const before = tree();
    const snapshot = JSON.parse(JSON.stringify(before));
    const plan = planFolderMove(before, 'C', 'B', NOW);
    expect(before).toEqual(snapshot);
    expect(plan.folders.map((x) => x.id)).toEqual(before.map((x) => x.id));
    const byId = Object.fromEntries(plan.folders.map((x) => [x.id, x]));
    expect(byId.A).toEqual(snapshot[0]);
    expect(byId.A1a).toEqual(snapshot[2]);
  });

  it('counts depth from the parent links, not from the stored level', () => {
    const folders = tree();
    folders[3].nestLevel = 2; // B is a top-level folder whatever it says
    const plan = planFolderMove(folders, 'C', 'B', NOW);
    expect(plan.ok).toBe(true);
  });

  it('is a no-op when the folder is already there', () => {
    const folders = tree();
    const plan = planFolderMove(folders, 'A1', 'A', NOW);
    expect(plan).toEqual({ ok: true, changed: false, folders });
    expect(planFolderMove(folders, 'B', false, NOW).changed).toBe(false);
  });

  it.each([
    ['A', 'A'],
    ['A', 'A1'],
    ['A', 'A1a'],
    ['A1', 'A1a'],
  ])('refuses to move %s into itself or below itself (%s)', (id, to) => {
    const plan = planFolderMove(tree(), id, to, NOW);
    expect(plan.ok).toBe(false);
    expect(plan.message).toMatch(/itself or one of its subfolders/);
  });

  it.each([
    // A has two levels below it: under B it would reach level 3.
    ['A', 'B'],
    // A1 has one level below it: under C1 (level 1) it would reach level 3.
    ['A1', 'C1'],
    // C has one level below it: under A1 (level 1) it would reach level 3.
    ['C', 'A1'],
  ])('refuses a move that would nest too deep (%s under %s)', (id, to) => {
    const plan = planFolderMove(tree(), id, to, NOW);
    expect(plan.ok).toBe(false);
    expect(plan.message).toBe('Maximum folder nest level exceeded.');
  });

  it('allows a move that ends exactly on the last level', () => {
    // B has no subfolders: under C1 (level 1) it is level 2, the last level.
    const plan = planFolderMove(tree(), 'B', 'C1', NOW);
    expect(plan.ok).toBe(true);
    expect(plan.folders.find((x) => x.id === 'B').nestLevel).toBe(2);
    // C1 has no subfolders either: under A1 (level 1) it is level 2.
    expect(planFolderMove(tree(), 'C1', 'A1', NOW).ok).toBe(true);
  });

  it('refuses a missing folder and a missing destination', () => {
    expect(planFolderMove(tree(), 'nope', 'A', NOW)).toEqual({
      ok: false,
      message: 'Folder not found.',
    });
    expect(planFolderMove(tree(), 'B', 'nope', NOW)).toEqual({
      ok: false,
      message: 'Destination folder not found.',
    });
  });

  it('survives a stored count that is not a number', () => {
    const folders = tree();
    (folders[4] as any).items = undefined;
    const plan = planFolderMove(folders, 'C', 'B', NOW);
    expect(plan.ok).toBe(true);
    expect(plan.folders.find((x) => x.id === 'B').items).toBe(0);
  });
});
