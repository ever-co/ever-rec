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
  selectPageArea,
  selectedAreaCapture,
  selectedAreaCaptureSW,
  sendImageToEditorPage,
  loadScreen,
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
  videoRecordingTime,
  resumeOrPauseRecordingSW,
  sendTimeToSW,
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
  windowLoaded,
  tabContent,
  controllerHandler,
  controllerHandlerCS,
  showTabController,
  hideTabController,
}

export type ExternalMessagesType = 'emailPassLogin' | 'googleLogin' | 'reauth';
