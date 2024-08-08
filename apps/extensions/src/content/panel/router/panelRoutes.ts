export type RouteName =
  | 'index'
  | 'install'
  | 'grant'
  | 'mediaRoutes'
  | 'integrations'
  | 'videos'
  | 'video'
  | 'image'
  | 'images'
  | 'imagesShared'
  | 'imagesTrashed'
  | 'edit'
  | 'signin'
  | 'settings'
  | 'profile'
  | 'preferences'
  | 'upload'
  | 'cameraonly'
  | 'desktopCapture'
  | 'workspace'
  | 'workspaceImage'
  | 'workspaceVideo'
  | 'workspaceSettings'
  | 'manageWorkspace'
  | 'manageWorkspaceTeams'
  | 'noAccess';

export interface IPanelRoute {
  path: string;
  nestedPath?: string;
}

export const panelRoutes: Record<RouteName, IPanelRoute> = {
  index: {
    path: `${process.env.WEBSITE_URL}/index.html`,
  },
  signin: {
    path: `${process.env.WEBSITE_URL}/auth`,
  },
  install: {
    path: `/install.html`,
  },
  grant: {
    path: '/grantAccess.html',
  },
  mediaRoutes: {
    path: '/media/*',
  },
  images: {
    path: `/media/images.html`,
    nestedPath: 'images.html',
  },
  videos: {
    path: `/media/videos.html`,
    nestedPath: 'videos.html',
  },
  integrations: {
    path: '/media/integrations.html',
    nestedPath: 'integrations.html',
  },
  imagesShared: {
    path: `/media/shared.html`,
    nestedPath: 'shared.html',
  },
  imagesTrashed: {
    path: `/media/trashed.html`,
    nestedPath: 'trashed.html',
  },
  workspace: {
    path: '/media/workspace.html',
    nestedPath: 'workspace.html',
  },
  workspaceImage: {
    path: 'ws-image.html',
  },
  workspaceVideo: {
    path: 'ws-video.html',
  },
  workspaceSettings: {
    path: '/media/workspace-settings.html',
    nestedPath: 'workspace-settings.html',
  },
  manageWorkspace: {
    path: '/media/manage-workspace.html',
    nestedPath: 'manage-workspace.html',
  },
  manageWorkspaceTeams: {
    path: '/media/manage-workspace-teams.html',
    nestedPath: 'manage-workspace-teams.html',
  },
  settings: {
    path: `/settings/*`,
  },
  profile: {
    path: `/settings/profile.html`,
    nestedPath: 'profile.html',
  },
  image: {
    path: `/image.html`,
  },
  video: {
    path: `/video.html`,
  },
  edit: {
    path: '/edit.html',
  },
  preferences: {
    path: '/preferences.html',
  },
  upload: {
    path: '/upload.html',
  },
  cameraonly: {
    path: '/camera-only.html',
  },
  desktopCapture: {
    path: '/desktop-capture.html',
  },
  noAccess: {
    path: '/no-access.html',
  },
};
