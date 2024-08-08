//?  CS = Content Script, SW = Service Worker, Port = open connection

export interface IAppMessage {
  action: AppMessagesEnum | ExternalMessagesType;
  payload?: any;
  start?: boolean;
  pause?: boolean;
  justInstalled?: boolean;
}

export enum AppMessagesEnum {
  authenticationPopupSW,
  screenOrWindowCapture,
  screenOrWindowCaptureSW,
  getDesctopScreen,
  openImageEditor,
  visiblePartCaptureSW,
  manipulateNativeScrollbars,
  visiblePartCapturePort,
  fullPageCapture,
  progressIndicatorPort,
  streamServiceUploadProgress,
  selectPageArea,
  hideSelectPageArea,
  selectedAreaCapture,
  selectedAreaCaptureSW,
  sendImageToEditorPage,
  gifAnimation,
  gifAnimationSW,
  capturingTime,
  capturingTimeSW,
  capturingTimeCS,
  stopCapture,
  stopCaptureSW,
  stopCaptureCS,
  startVideo,
  requestAudio,
  videoRecordingTimeSW,
  videoRecordingTime,
  resumeOrPauseRecordingSW,
  cancelVideoRecording,
  audioLoadedFromPopup,
  imageSaveLocal,
  cancelSaveVideo,
  controlMic,
  hideContentOnChange,
  setVideoTitle,
  setVideoContent,
  stopVideo,
  injectPlayPauseVideo,
  getTabTitle,
  downloadImage,
  closePopup,
  stopRecordingSW,
  videoStatusSW,
  setBadgeTextPort,
  uploadExistingImageSW,
  setVisiblePartDelay,
  visiblePartCaptureDelay,
  createLoginTabSW,
  getExplorerData,
  stopCameraOnlySW,
  stopCameraOnly,
  discardCameraOnlySW,
  discardCameraOnly,
  tabContent,
  controllerHandler,
  controllerHandlerCS,
  showTabController,
  hideTabController,
  sendTimeToPopup,
  signIn,
  signOut,
  videoUploaded,
  saveImage,
  streamServiceUploadProgressSW,
  getLatestRecordingTime,
  getWindowDimensions,
}

export type ExternalMessagesType =
  | 'signIn'
  | 'signOut'
  | 'openImageEdit'
  | 'updateUserData'
  | 'reAuth'
  | 'setDriveUser'
  | 'saveImage'
  | 'setActiveWorkspace';
