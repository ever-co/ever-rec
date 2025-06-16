import { useTranslation } from 'react-i18next';
import CaptureTabBtn from './CaptureTabBtn/CaptureTabBtn';
import AppSvg from '@/content/components/elements/AppSvg';

interface ICaptureTabsProps {
  isCaptureTab: boolean;
  setIsCaptureTab: (arg: boolean) => void;
}

const CaptureTabs: React.FC<ICaptureTabsProps> = ({
  isCaptureTab,
  setIsCaptureTab,
}) => {
  const { t } = useTranslation();
  return (
    <div className="tw-flex tw-h-12">
      <CaptureTabBtn
        active={isCaptureTab}
        icon={
          <AppSvg
            path={
              isCaptureTab
                ? 'images/popup/capture/capture_purple.svg'
                : 'images/popup/capture/capture_black.svg'
            }
          />
        }
        title={t('ext.capture.capture')}
        borderTopLeft
        tabClicked={() => setIsCaptureTab(true)}
      />
      <CaptureTabBtn
        active={!isCaptureTab}
        icon={
          <AppSvg
            path={
              !isCaptureTab
                ? 'images/popup/capture/video_recording_purple.svg'
                : 'images/popup/capture/video_recording_black.svg'
            }
          />
        }
        title={t('ext.capture.record')}
        borderTopRight
        tabClicked={() => setIsCaptureTab(false)}
      />
    </div>
  );
};

export default CaptureTabs;
