/**
 * The public invite page (`WorkspacePublicService.getWorkspaceInviteData`) names the inviter and
 * the members from their records `users/<uid>`. Deleting an account removes that record while
 * invites and workspaces can still name the user, so a missing record must not fail the page.
 */
import {
  InMemoryDatabase,
  InMemoryFirebaseApp,
} from '../../../../../test/support/in-memory-firebase';
import { ResStatusEnum } from '../../../../enums/ResStatusEnum';
import { WorkspacePublicService } from './public.service';

let mockDb: InMemoryDatabase;
jest.mock('firebase-admin', () => ({ database: () => mockDb }));

describe('workspace invite data', () => {
  const service = new WorkspacePublicService();

  beforeEach(async () => {
    mockDb = new InMemoryFirebaseApp().db;
    await mockDb.ref('users/uid-2').set({
      email: 'two@example.test',
      displayName: 'Two',
    });
    await mockDb.ref('users/uid-3').set({ email: 'three@example.test' });
  });

  it('answers with the workspace when the inviter record is missing', async () => {
    await mockDb.ref('workspaceInvites/inv-1').set({
      inviterId: 'uid-deleted',
      workspaceId: 'ws-1',
    });
    await mockDb.ref('workspaces/ws-1').set({
      name: 'Team',
      admin: 'uid-2',
      members: [{ id: 'uid-2' }, { id: 'uid-3' }],
    });

    const result = await service.getWorkspaceInviteData('inv-1');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data).toEqual({
      id: 'inv-1',
      workspaceInviter: '',
      workspaceName: 'Team',
      workspaceMembers: ['Two', 'three'],
    });
  });

  it('skips a member whose record is missing', async () => {
    await mockDb.ref('workspaceInvites/inv-2').set({
      inviterId: 'uid-2',
      workspaceId: 'ws-2',
    });
    await mockDb.ref('workspaces/ws-2').set({
      name: 'Studio',
      admin: 'uid-2',
      members: [{ id: 'uid-2' }, { id: 'uid-deleted' }, { id: 'uid-3' }],
    });

    const result = await service.getWorkspaceInviteData('inv-2');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data).toEqual({
      id: 'inv-2',
      workspaceInviter: 'Two',
      workspaceName: 'Studio',
      workspaceMembers: ['Two', 'three'],
    });
  });

  it('skips a member whose record has no email and no name', async () => {
    await mockDb.ref('users/uid-4').set({ photoURL: 'https://img.test/4' });
    await mockDb.ref('workspaceInvites/inv-3').set({
      inviterId: 'uid-2',
      workspaceId: 'ws-3',
    });
    await mockDb.ref('workspaces/ws-3').set({
      name: 'Crew',
      admin: 'uid-2',
      members: [{ id: 'uid-4' }, { id: 'uid-2' }],
    });

    const result = await service.getWorkspaceInviteData('inv-3');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data?.workspaceMembers).toEqual(['Two']);
  });

  it('reads members stored as an object keyed by id', async () => {
    await mockDb.ref('workspaceInvites/inv-4').set({
      inviterId: 'uid-3',
      workspaceId: 'ws-4',
    });
    await mockDb.ref('workspaces/ws-4').set({
      name: 'Keyed',
      admin: 'uid-2',
      members: {
        'uid-2': { id: 'uid-2' },
        'uid-deleted': { id: 'uid-deleted' },
      },
    });

    const result = await service.getWorkspaceInviteData('inv-4');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data).toEqual({
      id: 'inv-4',
      workspaceInviter: 'three',
      workspaceName: 'Keyed',
      workspaceMembers: ['Two'],
    });
  });

  it('skips member entries without an id', async () => {
    await mockDb.ref('workspaceInvites/inv-5').set({
      inviterId: 'uid-2',
      workspaceId: 'ws-5',
    });
    await mockDb.ref('workspaces/ws-5').set({
      name: 'Gaps',
      admin: 'uid-2',
      members: [
        { id: 'uid-2' },
        null,
        { displayName: 'No id' },
        { id: 'uid-3' },
      ],
    });
    const refSpy = jest.spyOn(mockDb, 'ref');

    const result = await service.getWorkspaceInviteData('inv-5');

    expect(result.status).toBe(ResStatusEnum.success);
    expect(result.data?.workspaceMembers).toEqual(['Two', 'three']);
    // No lookup of a user without an id.
    expect(refSpy).not.toHaveBeenCalledWith('users/undefined');
  });

  it('gives the not-found error when the workspace of the invite is gone', async () => {
    await mockDb.ref('workspaceInvites/inv-6').set({
      inviterId: 'uid-2',
      workspaceId: 'ws-deleted',
    });

    const result = await service.getWorkspaceInviteData('inv-6');

    expect(result).toEqual({
      status: ResStatusEnum.error,
      message: "Couldn't find the workspace for this invite",
      error: null,
      data: null,
    });
  });

  it('gives the not-found error when the invite is gone', async () => {
    const result = await service.getWorkspaceInviteData('inv-missing');

    expect(result).toEqual({
      status: ResStatusEnum.error,
      message: "Couldn't find the workspace for this invite",
      error: null,
      data: null,
    });
  });
});
