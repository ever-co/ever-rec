export const panelRoutes = {
  login: '/login',
  register: '/register',
  reset: '/reset',
  workspace: '/workspace',
  getWorkspaceMain: (workspaceId: string) => `/workspace/${workspaceId}`,
  getWorkspaceSettings: (workspaceId: string) =>
    `/workspace/${workspaceId}/settings`,
  getWorkspaceMembers: (workspaceId: string) =>
    `/workspace/${workspaceId}/members`,
  getWorkspaceTeams: (workspaceId: string) => `/workspace/${workspaceId}/teams`,
  manageWorkspaces: '/workspaces/manage',
  workspaceTeams: '/workspaces/teams',
  newPassword: '/new-password',
  workspaceInvite: '/workspace/invite',
  image: '/image',
  video: '/video',
  sharedImage: '/image/shared',
  sharedVideo: '/video/shared',
  images: '/images',
  videos: '/videos',
  profile: '/profile',
  edit: '/edit',
  shared: '/shared',
  starred: '/starred',
  trashed: '/trashed',
  account: '/settings/account',
  password: '/settings/password',
  billing: '/settings/billing',
  integrations: '/integrations',
  index: '/',
  whiteboards: '/whiteboards',
};

export const preRoutes = {
  auth: '/auth',
  media: '/media',
  settings: '/settings',
};
