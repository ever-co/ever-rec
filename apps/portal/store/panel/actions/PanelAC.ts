import ActionType from 'app/interfaces/ActionType';
import IEditorImage, { IDbFolderData } from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import IExplorerData from 'app/interfaces/IExplorerData';
import { FolderTypeEnum } from 'app/enums/folderTypeEnum';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import { ItemTypeEnum } from 'app/enums/itemTypeEnum';

import {
  CHANGE_ACTIVE_ROUTE,
  CLEAR_UNSAVED_BASE64,
  SET_EDITOR_IMG,
  CLEAR_EDITOR_IMG,
  SET_EXPLORER_DATA,
  SET_LOADER_STATE,
  SET_SCREENSHOTS,
  SET_SHARED,
  SET_TRASH,
  SET_UNSAVED_BASE64,
  UPDATE_EXPLORER_FOLDER_DATA,
  UPDATE_EXPLORER_IMAGE_DATA,
  SET_CURRENT_TOOL,
  SET_VIDEO_BLOBURLS,
  CLEAR_VIDEO_BLOBURLS,
  SET_EDITOR_VIDEO,
  CLEAR_EDITOR_VIDEO,
  SET_EXPLORER_DATA_VIDEOS,
  UPDATE_EXPLORER_VIDEO_DATA,
  SET_SHARED_VIDEOS,
  SET_LOADER_VIDEO_STATE,
  SET_TRASH_VIDEOS,
  SET_FOLDER_TYPE,
  UPDATE_EXPLORER_VIDEO_FOLDER_DATA,
  RESET_EXPLORER_DATA_LOADER,
  SET_FROM_EXISTED,
  RESET_EXPLORER_DATA_LOADER_VIDEOS,
  SET_EMAIL_IMAGE,
  SET_SCREENSHOTS_FOLDER_ORDER,
  SET_VIDEOS_FOLDER_ORDER,
  SET_SCREENSHOTS_ITEM_ORDER,
  SET_VIDEOS_ITEM_ORDER,
  SET_WIN_ID,
  SET_VIDEO_DURATION,
  CLEAR_VIDEO_DURATION,
} from './actionTypes';

export default class PanelAC {
  static setActiveRoute({ activeRoute }: { activeRoute: string }): ActionType {
    return { type: CHANGE_ACTIVE_ROUTE, payload: activeRoute };
  }

  static setEditorImage({
    editorImage,
  }: {
    editorImage: IEditorImage;
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
    if (folderType === FolderTypeEnum.videoFolders) {
      return { type: SET_VIDEOS_FOLDER_ORDER, payload: folderOrderType };
    }
    return { type: SET_SCREENSHOTS_FOLDER_ORDER, payload: folderOrderType };
  }

  static setItemOrder(
    itemOrder: ItemOrderEnum,
    itemType: ItemTypeEnum,
  ): ActionType {
    if (itemType === ItemTypeEnum.videos) {
      return { type: SET_VIDEOS_ITEM_ORDER, payload: itemOrder };
    }

    return { type: SET_SCREENSHOTS_ITEM_ORDER, payload: itemOrder };
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
}
