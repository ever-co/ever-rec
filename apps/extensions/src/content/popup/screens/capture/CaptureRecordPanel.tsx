import React, { FC, useState } from 'react';
import AppButton from '@/content/components/controls/appButton/AppButton';
import classNames from 'classnames';
import { Select, Tooltip } from 'antd';
import CaptureRecordBtn from './components/CaptureRecordBtn/CaptureRecordBtn';
import AppSwitchNew from '@/content/components/controls/AppSwitchNew/AppSwitchNew';
import GrantBtn from './components/GrantBtn/GrantBtn';
import AppSvg from '@/content/components/elements/AppSvg';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

interface ICaptureRecordPanelProps {
  tabButton: boolean;
  desktopButton: boolean;
  cameraButton: boolean;
  cameraState: string;
  videoDevices: any;
  micState: string;
  microphoneMuted: boolean;
  audioDevices: any;
  countdown: boolean;
  videoStart: boolean;
  countState: any;
  streamOption: boolean;
  flipCamera: boolean;
  allowVideoRecording: boolean;
  grandAccess: boolean;
  gifType: boolean;
  tabPartVideo: () => void;
  fullScreenVideo: () => void;
  cameraOnlyVideo: () => void;
  changeCamera: (arg: string) => void;
  changeMic: (arg: string) => void;
  microphoneMuteUnmute: () => void;
  changeCountdown: (event: any) => void;
  recordVideo: () => void;
  changeCount: (arg: string) => void;
  changeStreamOption: (event: boolean) => void;
  changeFlip: (event: any) => void;
  handleGif: (event: any) => void;
}

const CaptureRecordPanel: FC<ICaptureRecordPanelProps> = ({
  tabButton,
  desktopButton,
  cameraButton,
  cameraState,
  videoDevices,
  micState,
  microphoneMuted,
  audioDevices,
  countdown,
  videoStart,
  countState,
  streamOption,
  flipCamera,
  allowVideoRecording,
  grandAccess,
  gifType,
  tabPartVideo,
  fullScreenVideo,
  cameraOnlyVideo,
  changeCamera,
  changeMic,
  microphoneMuteUnmute,
  changeCountdown,
  recordVideo,
  changeCount,
  changeStreamOption,
  changeFlip,
  handleGif,
}) => {
  const { t } = useTranslation();
  const [advancedOptions, setAdvancedOptions] = useState<boolean>(false);

  const streamTooltipTitle = t('ext.capture.streamingProvides');

  let microphoneTooltip = t('ext.capture.startRecordingUnmuted');
  if (microphoneMuted) {
    microphoneTooltip = t('ext.capture.startRecordingMuted');
  }

  return (
    <>
      <div>
        <div className="tw-px-3 tw-pt-2 tw-flex tw-justify-between tw-bg-white dark:tw-bg-section-black">
          <CaptureRecordBtn
            title={t('ext.capture.activeTab')}
            icon={
              <AppSvg
                path="images/popup/capture/Tab_inactive.svg"
                size="26px"
                className="tw-text-primary-purple dark:tw-text-primary-light-purple"
              />
            }
            onClick={tabPartVideo}
            color="tw-bg-white dark:tw-bg-section-black"
            active={tabButton}
            disabled={!allowVideoRecording}
          />
          <CaptureRecordBtn
            title={t('ext.capture.desktop')}
            icon={
              <AppSvg
                path="images/popup/capture/capture-visible-part.svg"
                size="26px"
                className="tw-text-primary-purple dark:tw-text-primary-light-purple"
              />
            }
            onClick={fullScreenVideo}
            color="tw-bg-white dark:tw-bg-section-black"
            active={desktopButton}
            disabled={!allowVideoRecording}
          />
          <CaptureRecordBtn
            title={t('ext.capture.cameraOnly')}
            icon={
              <AppSvg
                path="images/popup/capture/Camera-only.svg"
                size="26px"
                className="tw-text-primary-purple dark:tw-text-primary-light-purple"
              />
            }
            onClick={cameraOnlyVideo}
            color="tw-bg-white dark:tw-bg-section-black"
            active={cameraButton}
            disabled={!allowVideoRecording}
          />
        </div>
      </div>

      <div
        id="body"
        className="tw-bg-white tw-p-4 tw-pt-3 tw-rounded-b-lg dark:tw-bg-section-black"
      >
        <div className="tw-flex tw-items-center tw-mb-2">
          <div
            className={classNames(
              'tw-rounded-full tw-w-12 tw-h-12 tw-flex tw-items-center tw-justify-center tw-mr-3 tw-bg-blue-grey dark:tw-bg-panel-black',
            )}
          >
            <AppSvg
              path="images/popup/capture/camera-device.svg"
              size="24px"
              className="tw-text-primary-purple dark:tw-text-primary-light-purple"
            />
          </div>
          {!grandAccess ? (
            <Select
              value={cameraState}
              onChange={changeCamera}
              className="panel-select tw-text-xl tw-text-semibold tw-w-full dark:!tw-text-white dark:!tw-border-primary-light-purple"
            >
              <Option value="disabled" selected={cameraState == 'disabled'}>
                {t('ext.capture.disabled')}
              </Option>
              {videoDevices &&
                videoDevices.map((device: any) => (
                  <Option key={device.id} value={device.id}>
                    {device.label}
                  </Option>
                ))}
              ;
            </Select>
          ) : (
            <GrantBtn></GrantBtn>
          )}
        </div>
        <div className="tw-flex tw-items-center tw-mb-4 tw-w-full">
          <Tooltip placement="topRight" title={microphoneTooltip}>
            <div
              className={classNames(
                'tw-rounded-full tw-w-12 tw-h-12 tw-flex tw-items-center tw-justify-center tw-mr-3 tw-bg-blue-grey dark:tw-bg-panel-black tw-cursor-pointer',
              )}
              onClick={microphoneMuteUnmute}
            >
              <AppSvg
                path={
                  microphoneMuted
                    ? 'images/popup/capture/MicrophoneMuted.svg'
                    : 'images/popup/capture/Microphone.svg'
                }
                size={microphoneMuted ? '40px' : '22px'}
                className="tw-text-primary-purple dark:tw-text-primary-light-purple"
              />
            </div>
          </Tooltip>
          {!grandAccess ? (
            <Select
              value={micState}
              onChange={changeMic}
              className="panel-select dark:panel-select-dark tw-text-xl tw-text-semibold tw-w-full dark:!tw-text-white dark:!tw-border-primary-light-purple"
            >
              <Option value="disabled" selected={micState == 'disabled'}>
                {t('ext.capture.disabled')}
              </Option>
              {audioDevices &&
                audioDevices.map((device: any) => (
                  <Option key={device.id} value={device.id}>
                    {device.label}
                  </Option>
                ))}
              ;
            </Select>
          ) : (
            <GrantBtn></GrantBtn>
          )}
        </div>
        {/* <div className="tw-flex tw-justify-between tw-pb-4 tw-mr-1">
          <span className="tw-mr-4 tw-ml-16">Record animated GIF</span>
          <AppSwitchNew handleSwitch={handleGif} switched={gifType} />
        </div> */}
        <AppButton
          onClick={() => setAdvancedOptions(!advancedOptions)}
          bgColor="tw-bg-blue-grey"
          darkBgColor="dark:tw-bg-panel-black"
          twTextSize="tw-text-sm"
          full
        >
          <div className="tw-relative tw-w-full tw-text-center">
            {t('ext.capture.advanceOptions')}
            <AppSvg
              path="images/popup/capture/Chevron_close.svg"
              size="20px"
              className={classNames(
                'tw-absolute tw--right-2 tw-top-0',
                !advancedOptions && 'tw-rotate-180',
              )}
            />
          </div>
        </AppButton>
        {advancedOptions && (
          <div className="tw-mt-3 tw-mx-2 tw-flex tw-flex-col tw-gap-y-2">
            {/* <div className="tw-flex tw-justify-between">
              <span className="tw-mr-4">Flip camera</span>
              <AppSwitchNew handleSwitch={changeFlip} switched={flipCamera} />
            </div> */}
            {/* <div className="tw-flex tw-justify-between">
              <span className="tw-mr-4">Push to talk (Ctrl+M)</span>
              <AppSwitchNew
                handleSwitch={() => {
                  return; // TODO
                }}
                switched={false}
                disabled={true}
              />
            </div> */}
            <div className="tw-flex tw-justify-between tw-items-center">
              <div className="tw-flex tw-items-center">
                <Select
                  value={countState}
                  onChange={changeCount}
                  className="panel-select dark:panel-select-dark tw-text-xl tw-text-semibold tw-w-32 dark:!tw-text-white dark:!tw-border-primary-light-purple"
                >
                  <Option value="3" selected={countState == '3'}>
                    {t('ext.capture.seconds3')}
                  </Option>
                  <Option value="5">{t('ext.capture.seconds5')}</Option>
                  <Option value="10">{t('ext.capture.seconds10')}</Option>
                </Select>
                <span className="tw-ml-2">{t('ext.capture.countdown')}</span>
              </div>
              <AppSwitchNew
                handleSwitch={changeCountdown}
                switched={countdown}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-items-center">
              <div className="tw-flex tw-items-center">
                <span className="tw-ml-2">
                  {t('ext.capture.saveAsVideoStream')}
                </span>
                <Tooltip
                  className="tw-cursor-pointer"
                  placement="top"
                  title={streamTooltipTitle}
                >
                  <img
                    className="tw-w-5 tw-h-5 tw-ml-1"
                    src={`${chrome.runtime.getURL(
                      '/',
                    )}images/panel/common/information-icon.svg`}
                  />
                </Tooltip>
              </div>
              <AppSwitchNew
                handleSwitch={changeStreamOption}
                switched={streamOption}
              />
            </div>
            {/* <div className="tw-flex tw-justify-between">
              <span className="tw-mr-4">Only show toolbar on hover</span>
              <AppSwitchNew
                handleSwitch={() => {
                  return; // TODO
                }}
                disabled={true}
                switched={false}
              />
            </div> */}
          </div>
        )}
      </div>
      <AppButton
        onClick={recordVideo}
        full
        twTextSize="tw-text-sm"
        className="tw-mt-4"
        disabled={
          (cameraButton && cameraState == 'disabled') ||
          !allowVideoRecording ||
          videoStart
        }
      >
        {videoStart
          ? t('ext.capture.stopRecording')
          : t('ext.capture.startRecording')}
      </AppButton>
    </>
  );
};

export default CaptureRecordPanel;
