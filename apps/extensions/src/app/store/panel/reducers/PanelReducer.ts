import ActionType from '@/app/interfaces/ActionType';
import IEditorImage, { IDbFolderData } from '@/app/interfaces/IEditorImage';
import IEditorVideo from '@/app/interfaces/IEditorVideo';
import { PanelRoutesNames } from '@/content/panel/panelRouter/panel.route';
import { panelRoute } from '@/content/panel/panelRouter/routes';
import { ItemOrderEnum } from '@/content/panel/screens/imagesScreen/pages/shared/enums/itemOrderEnum';
import {
  CHANGE_ACTIVE_ROUTE,
  CHANGE_FAVORITE_REFETCH,
  CLEAR_EDITOR_IMG,
  CLEAR_EDITOR_VIDEO,
  CLEAR_UNSAVED_BASE64,
  CLEAR_VIDEO_BLOBURLS,
  CLEAR_VIDEO_DURATION,
  RESET_EXPLORER_DATA_LOADER,
  RESET_EXPLORER_DATA_LOADER_VIDEOS,
  RESET_WORKSPACES,
  SET_ACTIVE_SIDEBAR_MENU_INDEX,
  SET_ACTIVE_WORKSPACE,
  SET_CHANNEL_LIST,
  SET_CURRENT_TOOL,
  SET_CURRENT_WORKSPACE_FOLDER,
  SET_EDITOR_IMG,
  SET_EDITOR_VIDEO,
  SET_EMAIL_IMAGE,
  SET_EXPLORER_DATA,
  SET_EXPLORER_DATA_VIDEOS,
  SET_FAVORITE_FOLDERS,
  SET_FOLDER_TYPE,
  SET_FROM_EXISTED,
  SET_INTEGRATIONS_MENU_OPEN,
  SET_JIRA_PROJECT_LIST,
  SET_LOADER_STATE,
  SET_LOADER_VIDEO_STATE,
  SET_SCREENSHOTS,
  SET_SCREENSHOTS_FOLDER_ORDER,
  SET_SCREENSHOTS_ITEM_ORDER,
  SET_SHARED,
  SET_SHARED_VIDEOS,
  SET_TRASH,
  SET_TRASH_VIDEOS,
  SET_TRELLO_DATA_LIST,
  SET_UNSAVED_BASE64,
  SET_VIDEO_BLOBURLS,
  SET_VIDEO_DURATION,
  SET_VIDEOS_FOLDER_ORDER,
  SET_VIDEOS_ITEM_ORDER,
  SET_WIN_ID,
  SET_WORKSPACE_LOADED,
  SET_WORKSPACES,
  UPDATE_EXPLORER_FOLDER_DATA,
  UPDATE_EXPLORER_IMAGE_DATA,
  UPDATE_EXPLORER_VIDEO_DATA,
  UPDATE_EXPLORER_VIDEO_FOLDER_DATA,
  UPDATE_WORKSPACES,
  SET_TOOLPANEL_POSITION,
  SET_WORKSPACE_ITEM_ORDER,
  SET_WORKSPACE_FOLDER_ORDER,
} from '../actions/actionTypes';
import IExplorerData from '@/app/interfaces/IExplorerData';
import { IWorkspace } from '@/app/interfaces/IWorkspace';

const initState = {
  activeRoute: panelRoute({ name: PanelRoutesNames.screenshots }),
  editorImage: null,
  currentImage: null,
  unsavedBase64: '',
  capturedTitle: '',
  sourceUrl: '',
  integrationsMenuOpen: false,
  activeSidebarMenuIndex: null,
  screenshots: [],
  screenshotsLoaded: false,
  toolspannelPosition: { x: 0, y: 0 },
  screenshotsFolderOrder: ItemOrderEnum.dateOldest,
  screenshotsItemOrder: ItemOrderEnum.dateNewest,
  explorerData: {
    allFolders: [],
    currentFolder: null,
    files: [],
    folders: [],
  },
  explorerDataLoaded: false,
  trash: [],
  trashLoaded: false,
  shared: [],
  sharedLoaded: false,
  loaderState: false,
  currentTool: {
    name: null,
  },
  blobs: '',
  videoTitle: null,
  blobUrls: null,
  videoDuration: null,
  editorVideo: null,
  explorerDataVideos: {
    allFolders: [],
    currentFolder: null,
    files: [],
    folders: [],
  },
  explorerDataVideosLoaded: false,
  videosFolderOrder: ItemOrderEnum.dateOldest,
  videosItemOrder: ItemOrderEnum.dateNewest,
  sharedVideos: [],
  sharedVideosLoaded: false,
  trashVideos: [],
  trashVideosLoaded: false,
  folderType: null,
  fromExisted: false,
  emailImageState: {
    emailImage: false,
    emailImageLink: null,
    itemPublicLink: null,
  },
  winId: null,
  channels: [],
  jiraData: [],
  trelloData: {
    boards: [],
  },
  shareThirdPartyOptions: {
    hasSlackShareAction: true,
    hasWhatAppShareAction: true,
    hasJiraShareAction: true,
    hasTrelloShareAction: true,
  },
  activeWorkspace: null,
  workspaces: [],
  currentWorkspaceFolder: null,
  workspaceLoaded: false,
  workspaceFolderOrder: ItemOrderEnum.dateOldest,
  workspaceItemOrder: ItemOrderEnum.dateNewest,
  favoriteFolders: { images: [], videos: [], workspaces: {} },
  refetchFavorites: 0,
};

const updateExplorerFolder = (
  foldersArg: IDbFolderData[],
  folder: IDbFolderData,
) => {
  for (let i = 0; i < foldersArg.length; i++) {
    if (foldersArg[i].id === folder.id) {
      foldersArg[i] = folder;
      return foldersArg;
    } else {
      foldersArg[i]?.children &&
        updateExplorerFolder(foldersArg[i].children, folder);
    }
  }

  return foldersArg;
};

export default function PanelReducer(state = initState, action: ActionType) {
  switch (action.type) {
    case CHANGE_FAVORITE_REFETCH:
      return { ...state, refetchFavorites: action.payload };
    case CHANGE_ACTIVE_ROUTE:
      return { ...state, activeRoute: action.payload };
    case SET_EDITOR_IMG:
      return { ...state, editorImage: action.payload };
    case CLEAR_EDITOR_IMG:
      return {
        ...state,
        editorImage: null,
      };
    case SET_SCREENSHOTS:
      return {
        ...state,
        screenshots: action.payload,
        screenshotsLoaded: true,
      };
    case SET_SCREENSHOTS_FOLDER_ORDER:
      return {
        ...state,
        screenshotsFolderOrder: action.payload,
      };
    case SET_SCREENSHOTS_ITEM_ORDER:
      return {
        ...state,
        screenshotsItemOrder: action.payload,
      };
    case SET_VIDEOS_FOLDER_ORDER:
      return {
        ...state,
        videosFolderOrder: action.payload,
      };
    case SET_VIDEOS_ITEM_ORDER:
      return {
        ...state,
        videosItemOrder: action.payload,
      };
    case SET_EXPLORER_DATA:
      return {
        ...state,
        explorerData: action.payload,
        explorerDataLoaded: true,
      };
    case RESET_EXPLORER_DATA_LOADER:
      return {
        ...state,
        explorerDataLoaded: false,
      };
    case RESET_EXPLORER_DATA_LOADER_VIDEOS:
      return {
        ...state,
        explorerDataVideosLoaded: false,
      };
    case UPDATE_EXPLORER_IMAGE_DATA: {
      const image: IEditorImage = action.payload;
      const explorerData = { ...state.explorerData };
      const files: any = [...explorerData.files];
      const index = files.findIndex(
        (f: any) => f.dbData?.id === image.dbData?.id,
      );
      if (index !== -1) {
        files[index] = { ...image };
      }
      explorerData.files = files;
      return {
        ...state,
        explorerData,
      };
    }
    case UPDATE_EXPLORER_FOLDER_DATA: {
      const folder: IDbFolderData = action.payload;
      const explorerData: IExplorerData = { ...state.explorerData };
      const folderChildren: IDbFolderData[] = explorerData.currentFolder
        ? explorerData.currentFolder.children
        : explorerData.allFolders;

      const folders = updateExplorerFolder(folderChildren, folder);
      explorerData.folders = folders;
      return {
        ...state,
        explorerData,
      };
    }
    case UPDATE_EXPLORER_VIDEO_FOLDER_DATA: {
      const folder: IDbFolderData = action.payload;
      const explorerDataVideos: IExplorerData = { ...state.explorerDataVideos };
      const folderChildren: IDbFolderData[] = explorerDataVideos.currentFolder
        ? explorerDataVideos.currentFolder.children
        : explorerDataVideos.allFolders;

      const folders = updateExplorerFolder(folderChildren, folder);
      explorerDataVideos.folders = folders;
      return {
        ...state,
        explorerDataVideos,
      };
    }
    case SET_TRASH:
      return {
        ...state,
        trash: action.payload,
        trashLoaded: true,
      };
    case SET_SHARED:
      return {
        ...state,
        shared: action.payload,
        sharedLoaded: true,
      };
    case SET_UNSAVED_BASE64:
      return {
        ...state,
        unsavedBase64: action.payload.unsavedBase64,
        capturedTitle: action.payload.capturedTitle,
        sourceUrl: action.payload.sourceUrl,
      };
    case CLEAR_UNSAVED_BASE64:
      return {
        ...state,
        unsavedBase64: '',
        capturedTitle: '',
        sourceUrl: '',
      };
    case SET_TOOLPANEL_POSITION:
      return {
        ...state,
        toolspannelposition: action.payload,
      };
    case SET_LOADER_STATE:
      return {
        ...state,
        loaderState: action.payload,
      };
    case SET_FROM_EXISTED:
      return {
        ...state,
        fromExisted: action.payload,
      };
    case SET_CURRENT_TOOL:
      return {
        ...state,
        currentTool: action.payload,
      };
    case SET_VIDEO_BLOBURLS:
      return {
        ...state,
        videoTitle: action.payload.videoTitle,
        blobUrls: action.payload.blobUrls,
      };
    case CLEAR_VIDEO_BLOBURLS:
      return {
        ...state,
        videoTitle: null,
        blobUrl: null,
      };
    case SET_VIDEO_DURATION:
      return {
        ...state,
        videoDuration: action.payload.videoDuration,
      };
    case CLEAR_VIDEO_DURATION:
      return {
        ...state,
        videoDuration: null,
      };
    case SET_EDITOR_VIDEO:
      return { ...state, editorVideo: action.payload };
    case CLEAR_EDITOR_VIDEO:
      return {
        ...state,
        editorVideo: null,
      };
    case SET_EXPLORER_DATA_VIDEOS:
      return {
        ...state,
        explorerDataVideos: action.payload,
        explorerDataVideosLoaded: true,
      };
    case UPDATE_EXPLORER_VIDEO_DATA: {
      const video: IEditorVideo = action.payload;
      const explorerDataVideos = { ...state.explorerDataVideos };
      const files: any = [...explorerDataVideos.files];
      const index = files.findIndex(
        (f: any) => f.dbData?.id === video.dbData?.id,
      );
      if (index !== -1) {
        files[index] = { ...video };
      }
      explorerDataVideos.files = files;
      return {
        ...state,
        explorerDataVideos,
      };
    }
    case SET_SHARED_VIDEOS:
      return {
        ...state,
        sharedVideos: action.payload,
        sharedVideoLoaded: true,
      };
    case SET_LOADER_VIDEO_STATE:
      return {
        ...state,
        sharedVideoLoaded: action.payload,
      };
    case SET_TRASH_VIDEOS:
      return {
        ...state,
        trashVideos: action.payload,
        trashVideosLoaded: true,
      };
    case SET_FOLDER_TYPE:
      return {
        ...state,
        folderType: action.payload,
      };
    case SET_EMAIL_IMAGE:
      return {
        ...state,
        emailImageState: action.payload,
      };
    case SET_WIN_ID:
      return {
        ...state,
        winId: action.payload,
      };
    case SET_CHANNEL_LIST:
      return {
        ...state,
        channels: action.payload,
      };
    case SET_ACTIVE_WORKSPACE: {
      const workspaces: (IWorkspace | IWorkspace)[] = state.workspaces;
      let activeWorkspace: IWorkspace | null = null;

      if (state.workspaces && action.payload) {
        const activeWorkspaceIndex = workspaces.findIndex(
          (x) => x.id === action.payload.id,
        );
        if (activeWorkspaceIndex !== -1) {
          workspaces[activeWorkspaceIndex] = action.payload;
          activeWorkspace = workspaces[activeWorkspaceIndex];
        } else {
          activeWorkspace = action.payload;
        }
      }
      return {
        ...state,
        workspaces,
        activeWorkspace,
      };
    }
    case SET_INTEGRATIONS_MENU_OPEN:
      return {
        ...state,
        integrationsMenuOpen: action.payload,
      };
    case SET_ACTIVE_SIDEBAR_MENU_INDEX:
      return {
        ...state,
        activeSidebarMenuIndex: action.payload,
      };
    case SET_JIRA_PROJECT_LIST:
      return {
        ...state,
        jiraData: action.payload,
      };
    case SET_TRELLO_DATA_LIST:
      return {
        ...state,
        trelloData: action.payload,
      };
    case SET_WORKSPACES:
      return {
        ...state,
        workspaces: action.payload,
      };
    case UPDATE_WORKSPACES: {
      const updatedWorkspace = action.payload;
      const newWorkspaces: IWorkspace[] = state.workspaces.map(
        (workspace: IWorkspace) => {
          if (workspace.id === updatedWorkspace.workspaceId) {
            return updatedWorkspace;
          }
          return workspace;
        },
      );

      return {
        ...state,
        workspaces: newWorkspaces,
      };
    }
    case RESET_WORKSPACES:
      return {
        ...state,
        workspaces: [],
        activeWorkspace: null,
      };
    case SET_CURRENT_WORKSPACE_FOLDER:
      return {
        ...state,
        currentWorkspaceFolder: action.payload,
      };
    case SET_WORKSPACE_LOADED:
      return {
        ...state,
        workspaceLoaded: action.payload,
      };
    case SET_FAVORITE_FOLDERS:
      return {
        ...state,
        favoriteFolders: action.payload,
      };
    case SET_WORKSPACE_ITEM_ORDER:
      return {
        ...state,
        workspaceItemOrder: action.payload,
      };
    case SET_WORKSPACE_FOLDER_ORDER:
      return {
        ...state,
        workspaceFolderOrder: action.payload,
      };
    default:
      return state;
  }
}
