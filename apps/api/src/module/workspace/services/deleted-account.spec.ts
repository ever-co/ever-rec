/**
 * Deleting an account removes its record `users/<uid>`, while workspaces, teams and their items
 * still name that uid. The other members must still open the workspace, list the teams and open
 * the public links of the items the deleted account uploaded.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InMemoryFirebaseApp } from '../../../../test/support/in-memory-firebase';
import { ResStatusEnum } from '../../../enums/ResStatusEnum';
import { AuthOrchestratorService } from '../../auth/services/auth-orchestrator.service';
import { UserProfileService } from '../../auth/services/user-profile.service';
import { UserService } from '../../auth/services/user.service';
import { ImageService } from '../../image/image.service';
import { VideoService } from '../../video/video.service';
import { WorkspaceTeamsService } from './teams.service';
import { WorkspaceUtilitiesService } from './utilities.service';
import { WorkspacesService } from './workspace.service';

let mockFirebase: InMemoryFirebaseApp;

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  database: () => mockFirebase.database(),
  storage: () => mockFirebase.storage(),
}));

// Image resizing is not under test; this keeps the native module from loading.
jest.mock('sharp', () => ({ __esModule: true, default: jest.fn() }));

describe('workspaces after a member deletes their account', () => {
  let events: EventEmitter2;

  const firebaseAdmin = () =>
    ({
      getDatabaseRef: (path: string) => mockFirebase.db.ref(path),
      getStorageBucket: () => mockFirebase.bucket,
      deleteUser: (uid: string) => mockFirebase.authService.deleteUser(uid),
    }) as any;

  const deleteAccount = async (uid: string) => {
    const orchestrator = new AuthOrchestratorService(
      new UserService(firebaseAdmin(), events),
      {} as any,
      {} as any,
      {} as any,
      new UserProfileService(firebaseAdmin(), events),
      { removeShared: async () => null } as any,
      events,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const result = await orchestrator.deleteUser(uid);
    expect(result.status).toBe(ResStatusEnum.success);
    expect(mockFirebase.db.dump(`users/${uid}`)).toBeNull();
  };

  const shareOnly = (link: string, itemId: string) =>
    mockFirebase.db
      .ref('sharedWorkspaceItems')
      .set({ [link]: { workspaceId: 'ws-1', itemId } });

  beforeEach(async () => {
    mockFirebase = new InMemoryFirebaseApp();
    events = new EventEmitter2();
    mockFirebase.authService.addUser({
      uid: 'uid-1',
      email: 'one@example.test',
    });
    mockFirebase.authService.addUser({
      uid: 'uid-2',
      email: 'two@example.test',
    });
    await mockFirebase.db.ref('users/uid-1').set({
      email: 'one@example.test',
      displayName: 'One',
      workspaceIds: ['ws-1'],
    });
    await mockFirebase.db.ref('users/uid-2').set({
      email: 'two@example.test',
      displayName: 'Two',
      workspaceIds: ['ws-1'],
    });
    await mockFirebase.db.ref('workspaces/ws-1').set({
      id: 'ws-1',
      name: 'Team',
      admin: 'uid-2',
      members: [{ id: 'uid-1' }, { id: 'uid-2' }],
      teams: [
        {
          id: 't1',
          name: 'A',
          admin: 'uid-2',
          members: [{ id: 'uid-1' }, { id: 'uid-2' }],
        },
        { id: 't2', name: 'B', admin: 'uid-2', members: [{ id: 'uid-1' }] },
      ],
      screenshots: {
        s1: { uid: 'uid-1', parentId: false, refName: 'a.png', title: 'a' },
        s2: { uid: 'uid-2', parentId: false, refName: 'b.png', title: 'b' },
      },
      videos: {
        v1: {
          id: 'v1',
          uid: 'uid-1',
          parentId: false,
          refName: 'a.webm',
          title: 'v',
        },
      },
    });
  });

  it('the other members still open the workspace', async () => {
    await deleteAccount('uid-1');

    const result = await new WorkspacesService(
      new WorkspaceUtilitiesService(),
      {} as any,
      events,
    ).getSingleWorkspace('uid-2', 'ws-1', false);

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data?.members).toEqual([
      expect.objectContaining({ id: 'uid-2', displayName: 'Two' }),
    ]);
  });

  it('the teams list leaves the deleted member out', async () => {
    await deleteAccount('uid-1');

    const result = await new WorkspaceTeamsService(
      new WorkspaceUtilitiesService(),
      events,
    ).getTeamsMembers('ws-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data).toEqual({
      t1: [expect.objectContaining({ id: 'uid-2' })],
    });
  });

  it('the public links of the items the deleted member uploaded still open', async () => {
    await deleteAccount('uid-1');

    await shareOnly('link-1', 's1');
    const image = await new ImageService(
      {} as any,
      {} as any,
      events,
      {} as any,
    ).getImageBySharedId('link-1', true);
    expect(image?.image.owner).toEqual({
      displayName: undefined,
      photoURL: undefined,
      id: 'uid-1',
    });

    await shareOnly('link-2', 'v1');
    const video = await new VideoService(
      {} as any,
      events,
      {} as any,
      {} as any,
    ).getVideoBySharedId('link-2', true);
    expect(video.status).toBe(ResStatusEnum.success);
    expect(video.data?.video.owner).toEqual({
      displayName: undefined,
      photoURL: undefined,
      id: 'uid-1',
    });
  });
});
