import ActionType from 'app/interfaces/ActionType';
import IEditorImage, { IDbFolderData } from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import IExplorerData from 'app/interfaces/IExplorerData';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';

import {
  CHANGE_ACTIVE_ROUTE,
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
  SET_WORKSPACE_FETCHED,
  CHANGE_FAVORITE_REFETCH,
} from './actionTypes';
import { ITrelloData } from 'app/interfaces/IIntegrationTypes';
import { IWorkspace, IWorkspaceImage } from 'app/interfaces/IWorkspace';
import { IFavoriteFolders } from 'app/interfaces/Folders';
export default class PanelAC {
  static setActiveRoute({ activeRoute }: { activeRoute: string }): ActionType {
    return { type: CHANGE_ACTIVE_ROUTE, payload: activeRoute };
  }

  static setEditorImage({
    editorImage,
  }: {
    editorImage: IEditorImage | IWorkspaceImage;
  }): ActionType {
    return { type: SET_EDITOR_IMG, payload: editorImage };
  }
  static clearEditorImage(): ActionType {
    return { type: CLEAR_EDITOR_IMG };
  }
  static setUnsavedBase64({
    unsavedBase64,
    capturedTitle,
    sourceUrl,
  }: {
    unsavedBase64: string;
    capturedTitle?: string;
    sourceUrl?: string;
  }): ActionType {
    return {
      type: SET_UNSAVED_BASE64,
      payload: {
        unsavedBase64,
        capturedTitle,
        sourceUrl,
      },
    };
  }

  static clearUnsavedBase64(): ActionType {
    return {
      type: CLEAR_UNSAVED_BASE64,
    };
  }

  static setScreenshots({
    screenshots,
  }: {
    screenshots: IEditorImage[];
  }): ActionType {
    return { type: SET_SCREENSHOTS, payload: screenshots };
  }

  static setFolderOrder(
    folderOrderType: ItemOrderEnum,
    folderType: FolderTypeEnum,
  ): ActionType {
    if (folderType === FolderTypeEnum.workspaceFolders) {
      return { type: SET_WORKSPACE_FOLDER_ORDER, payload: folderOrderType };
    } else if (folderType === FolderTypeEnum.videoFolders) {
      return { type: SET_VIDEOS_FOLDER_ORDER, payload: folderOrderType };
    } else {
      return { type: SET_SCREENSHOTS_FOLDER_ORDER, payload: folderOrderType };
    }
  }

  static setItemOrder(
    itemOrder: ItemOrderEnum,
    itemType: ItemTypeEnum,
  ): ActionType {
    if (itemType === ItemTypeEnum.mixed) {
      return { type: SET_WORKSPACE_ITEM_ORDER, payload: itemOrder };
    } else if (itemType === ItemTypeEnum.videos) {
      return { type: SET_VIDEOS_ITEM_ORDER, payload: itemOrder };
    } else {
      return { type: SET_SCREENSHOTS_ITEM_ORDER, payload: itemOrder };
    }
  }

  static setExplorerData({
    explorerData,
  }: {
    explorerData: IExplorerData;
  }): ActionType {
    return { type: SET_EXPLORER_DATA, payload: explorerData };
  }

  static resetExplorerDataLoader(): ActionType {
    return { type: RESET_EXPLORER_DATA_LOADER };
  }

  static resetExplorerDataLoaderVideos(): ActionType {
    return { type: RESET_EXPLORER_DATA_LOADER_VIDEOS };
  }

  static updateExplorerImageData({
    image,
  }: {
    image: IEditorImage;
  }): ActionType {
    return { type: UPDATE_EXPLORER_IMAGE_DATA, payload: image };
  }

  static updateExplorerFolderData({
    folder,
  }: {
    folder: IDbFolderData;
  }): ActionType {
    return { type: UPDATE_EXPLORER_FOLDER_DATA, payload: folder };
  }

  static setTrash({ trash }: { trash: IEditorImage[] }): ActionType {
    return { type: SET_TRASH, payload: trash };
  }

  static setShared({ shared }: { shared: IEditorImage[] }): ActionType {
    return { type: SET_SHARED, payload: shared };
  }

  static setLoaderState(loaderState: boolean): ActionType {
    return { type: SET_LOADER_STATE, payload: loaderState };
  }

  static setToolPanelPosition(x: number, y: number): ActionType {
    return { type: SET_TOOLPANEL_POSITION, payload: { x, y } };
  }

  static setFromExistedImage(fromExisted: boolean): ActionType {
    return { type: SET_FROM_EXISTED, payload: fromExisted };
  }

  static setCurrentTool(tool: any): ActionType {
    return { type: SET_CURRENT_TOOL, payload: tool };
  }

  static setVideoDuration({
    videoDuration,
  }: {
    videoDuration: number;
  }): ActionType {
    return { type: SET_VIDEO_DURATION, payload: { videoDuration } };
  }

  static clearVideoDuration(): ActionType {
    return { type: CLEAR_VIDEO_DURATION };
  }

  static setVideoBlobUrls({
    videoTitle,
    blobUrls,
  }: {
    videoTitle: string;
    blobUrls: string[];
  }): ActionType {
    return { type: SET_VIDEO_BLOBURLS, payload: { videoTitle, blobUrls } };
  }

  static setWinId(winId: number | null): ActionType {
    return { type: SET_WIN_ID, payload: winId };
  }

  static clearVideoBlobUrls(): ActionType {
    return {
      type: CLEAR_VIDEO_BLOBURLS,
    };
  }

  static setEditorVideo({
    editorVideo,
  }: {
    editorVideo: IEditorVideo;
  }): ActionType {
    return { type: SET_EDITOR_VIDEO, payload: editorVideo };
  }

  static clearEditorVideo(): ActionType {
    return {
      type: CLEAR_EDITOR_VIDEO,
    };
  }

  static setExplorerDataVideos({
    explorerDataVideos,
  }: {
    explorerDataVideos: IExplorerData;
  }): ActionType {
    return { type: SET_EXPLORER_DATA_VIDEOS, payload: explorerDataVideos };
  }

  static updateExplorerVideoData({
    video,
  }: {
    video: IEditorVideo;
  }): ActionType {
    return { type: UPDATE_EXPLORER_VIDEO_DATA, payload: video };
  }

  static updateExplorerVideoFolderData({
    folder,
  }: {
    folder: IDbFolderData;
  }): ActionType {
    return { type: UPDATE_EXPLORER_VIDEO_FOLDER_DATA, payload: folder };
  }

  static setSharedVideos({
    sharedVideos,
  }: {
    sharedVideos: IEditorVideo[];
  }): ActionType {
    return { type: SET_SHARED_VIDEOS, payload: sharedVideos };
  }

  static sharedVideosLoaded(loaderVideosState: boolean): ActionType {
    return { type: SET_LOADER_VIDEO_STATE, payload: loaderVideosState };
  }

  static setTrashVideos({
    trashVideos,
  }: {
    trashVideos: IEditorVideo[];
  }): ActionType {
    return { type: SET_TRASH_VIDEOS, payload: trashVideos };
  }

  static showFolders(folderType: FolderTypeEnum | null): ActionType {
    return { type: SET_FOLDER_TYPE, payload: folderType };
  }

  static setEmailImage({
    emailImage,
    emailImageLink,
    itemPublicLink,
  }: {
    emailImage: boolean;
    emailImageLink: string | null;
    itemPublicLink: string | null;
  }): ActionType {
    return {
      type: SET_EMAIL_IMAGE,
      payload: { emailImage, emailImageLink, itemPublicLink },
    };
  }

  static setChannels({ channels }: { channels: any[] }): ActionType {
    return { type: SET_CHANNEL_LIST, payload: channels };
  }

  static setActiveWorkspace({
    activeWorkspace,
  }: {
    activeWorkspace: IWorkspace;
  }): ActionType {
    return { type: SET_ACTIVE_WORKSPACE, payload: activeWorkspace };
  }

  static setJiraProjectData({ data }: { data: any[] }): ActionType {
    return { type: SET_JIRA_PROJECT_LIST, payload: data };
  }

  static setTrelloData({ data }: { data: ITrelloData }): ActionType {
    return { type: SET_TRELLO_DATA_LIST, payload: data };
  }

  static setIntegrationsMenuOpen({ state }: { state: boolean }): ActionType {
    return { type: SET_INTEGRATIONS_MENU_OPEN, payload: state };
  }

  static setActiveSidebarMenuIndex({ index }: { index: number }): ActionType {
    return { type: SET_ACTIVE_SIDEBAR_MENU_INDEX, payload: index };
  }

  static setWorkspaces({
    workspaces,
  }: {
    workspaces: IWorkspace[];
  }): ActionType {
    return { type: SET_WORKSPACES, payload: workspaces };
  }

  static updateWorkspaces({
    workspace,
  }: {
    workspace: IWorkspace;
  }): ActionType {
    return { type: UPDATE_WORKSPACES, payload: workspace };
  }

  static setCurrentWorkspaceFolder({ currentWorkspaceFolder }): ActionType {
    return {
      type: SET_CURRENT_WORKSPACE_FOLDER,
      payload: currentWorkspaceFolder,
    };
  }

  static resetWorkspaces(): ActionType {
    return { type: RESET_WORKSPACES };
  }

  static setWorkspaceLoaded({
    workspaceLoaded,
  }: {
    workspaceLoaded: boolean;
  }): ActionType {
    return { type: SET_WORKSPACE_LOADED, payload: workspaceLoaded };
  }
  static setWorkspaceFetched({
    workspaceFetched,
  }: {
    workspaceFetched: boolean;
  }): ActionType {
    return { type: SET_WORKSPACE_FETCHED, payload: workspaceFetched };
  }

  static setFavoriteFolders({
    folders,
  }: {
    folders: IFavoriteFolders;
  }): ActionType {
    return { type: SET_FAVORITE_FOLDERS, payload: folders };
  }
}
