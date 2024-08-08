import ActionType from 'app/interfaces/ActionType';
import IEditorImage, { IDbFolderData } from 'app/interfaces/IEditorImage';
import IEditorVideo from 'app/interfaces/IEditorVideo';
import { ItemOrderEnum } from 'app/enums/itemOrderEnum';
import {
  CHANGE_ACTIVE_ROUTE,
  CLEAR_UNSAVED_BASE64,
  SET_EDITOR_IMG,
  SET_EXPLORER_DATA,
  SET_LOADER_STATE,
  SET_SCREENSHOTS,
  SET_SCREENSHOTS_FOLDER_ORDER,
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
  CLEAR_EDITOR_IMG,
  RESET_EXPLORER_DATA_LOADER_VIDEOS,
  SET_EMAIL_IMAGE,
  SET_VIDEOS_FOLDER_ORDER,
  SET_SCREENSHOTS_ITEM_ORDER,
  SET_VIDEOS_ITEM_ORDER,
  SET_WIN_ID,
  SET_VIDEO_DURATION,
  CLEAR_VIDEO_DURATION,
} from '../actions/actionTypes';

const initState = {
  activeRoute: { name: 'screenshots' },
  editorImage: null,
  currentImage: null,
  unsavedBase64: '',
  capturedTitle: '',
  sourceUrl: '',
  screenshots: [],
  screenshotsLoaded: false,
  screenshotsFolderOrder: ItemOrderEnum.dateNewest,
  screenshotsItemOrder: ItemOrderEnum.dateNewest,
  explorerData: {
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
    currentFolder: null,
    files: [],
    folders: [],
  },
  explorerDataVideosLoaded: false,
  videosFolderOrder: ItemOrderEnum.dateNewest,
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
};

export default function PanelReducer(state = initState, action: ActionType) {
  switch (action.type) {
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
      const explorerData = { ...state.explorerData };
      const folders: any = [...explorerData.folders];
      const index = folders.findIndex((f: any) => f.id === folder.id);
      if (index !== -1) {
        folders[index] = { ...folder };
      }
      explorerData.folders = folders;
      return {
        ...state,
        explorerData,
      };
    }
    case UPDATE_EXPLORER_VIDEO_FOLDER_DATA: {
      const folder: IDbFolderData = action.payload;
      const explorerDataVideos = { ...state.explorerDataVideos };
      const folders: any = [...explorerDataVideos.folders];
      const index = folders.findIndex((f: any) => f.id === folder.id);
      if (index !== -1) {
        folders[index] = { ...folder };
      }
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
    default:
      return state;
  }
}
