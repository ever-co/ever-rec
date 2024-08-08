import { FC } from 'react';
import CaptureBtn from './components/CaptureBtn/CaptureBtn';
import CaptureHorizontalBtn from './components/CaptureHorizontalBtn/CaptureHorizontalBtn';
import AppSvg from '@/content/components/elements/AppSvg';

interface ICaptureScreenshotPanelProps {
  allowFullPage: boolean;
  allowSelection: boolean;
  allowEntireScreenOrAppWindow: boolean;
  visiblePartScreen: () => void;
  fullPageScreen: () => void;
  selectedAreaScreen: () => void;
  visiblePartDelay: () => void;
  screenOrWindow: () => void;
  existingImage: () => void;
}

const CaptureScreenshotPanel: FC<ICaptureScreenshotPanelProps> = ({
  allowFullPage,
  allowSelection,
  allowEntireScreenOrAppWindow,
  visiblePartScreen,
  fullPageScreen,
  selectedAreaScreen,
  visiblePartDelay,
  screenOrWindow,
  existingImage,
}) => {
  return (
    <div className="tw-block tw-p-3 tw-pt-2 tw-bg-white tw-rounded-b-lg">
      <div className="tw-flex tw-justify-between">
        <CaptureBtn
          title="Visible Part"
          color="tw-bg-white dark:tw-bg-section-black"
          icon={
            <AppSvg
              path="images/popup/capture/capture-visible-part.svg"
              size="28px"
              className="tw-text-primary-purple"
            />
          }
          onClick={() => visiblePartScreen()}
        />
        <CaptureBtn
          disabled={!allowFullPage}
          title="Full Page"
          color="tw-bg-white dark:tw-bg-section-black"
          icon={
            <AppSvg
              path="images/popup/capture/capture-fullpage.svg"
              size="28px"
              className="tw-text-primary-purple"
            />
          }
          onClick={() => fullPageScreen()}
        />
        <CaptureBtn
          disabled={!allowSelection}
          disabledTooltipPlacement="bottomLeft"
          title="Selected Area"
          color="tw-bg-white dark:tw-bg-section-black"
          icon={
            <AppSvg
              path="images/popup/capture/capture-selected-area.svg"
              size="28px"
              className="tw-text-primary-purple"
            />
          }
          onClick={() => selectedAreaScreen()}
        />
      </div>
      <div className="tw-flex tw-flex-col tw-mt-3 tw-gap-y-3">
        <CaptureHorizontalBtn
          title="Visible Part after Delay"
          color="tw-bg-blue-grey dark:tw-bg-panel-black"
          icon={
            <AppSvg
              path="images/popup/capture/timer.svg"
              size="25px"
              className="tw-text-primary-purple"
            />
          }
          onClick={() => visiblePartDelay()}
        />
        <CaptureHorizontalBtn
          disabled={!allowEntireScreenOrAppWindow}
          title="Entire Screen or App Window"
          color="tw-bg-blue-grey dark:tw-bg-panel-black"
          icon={
            <AppSvg
              path="images/popup/capture/laptop_mac.svg"
              size="25px"
              className="tw-text-primary-purple"
            />
          }
          onClick={() => screenOrWindow()}
        />
        <CaptureHorizontalBtn
          color="tw-bg-blue-grey dark:tw-bg-panel-black"
          title="Upload and Annotate Image"
          icon={
            <AppSvg
              path="images/popup/capture/existed-image.svg"
              size="25px"
              className="tw-text-primary-purple"
            />
          }
          onClick={() => existingImage()}
        />
      </div>
    </div>
  );
};

export default CaptureScreenshotPanel;
