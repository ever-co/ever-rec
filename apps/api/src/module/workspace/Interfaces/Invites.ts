export interface IWorkspaceInvite {
  id: string;
  inviterId: string;
  workspaceId: string;
  expires?: number;
}

export interface IWorkspaceInviteData {
  id: string;
  workspaceInviter: string;
  workspaceName: string;
  workspaceMembers: string[]; // todo member data interface - (photoURL, displayName, email)
}
