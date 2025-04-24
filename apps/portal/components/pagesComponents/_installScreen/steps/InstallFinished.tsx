import { AppMessagesEnum } from 'app/messagess';
import AppButton from 'components/controls/AppButton';
import AppHeader from 'components/elements/AppHeader';
import { sendRuntimeMessage } from 'app/utilities/scripts/sendRuntimeMessage';
import React, { useState } from 'react';
import { IStepProps } from './steps';
import { useTranslation } from 'react-i18next';

const InstallFinished: React.FC<IStepProps> = () => {
  const [disabled, setDisabled] = useState(false);

  const { t } = useTranslation();

  const makeScreenshotHandler = async () => {
    if (disabled) return;

    setDisabled(true);
    await sendRuntimeMessage({
      action: AppMessagesEnum.visiblePartCaptureSW,
      payload: {
        openEditor: true,
      },
    });
    setDisabled(false);
  };

  return (
    <div className="tw-w-full">
      <div className="tw-w-96">
        <AppHeader part1="Setup" part2="Finished!" className="tw-mb-8" />
        <div>
          <p>{t('page.install.completedGuide')}</p>
          <p>{t('page.install.clickRightSideExtension')}</p>
          <p>{t('page.install.belowScreenShotButton')}</p>

          <div className="tw-shadow-lg tw-rounded-xl tw-overflow-hidden tw-h-60">
            <img
              className="tw-w-full"
              src="/sign/setup_finished_screen_guide.png"
            />
          </div>
          <AppButton onClick={makeScreenshotHandler} full className="tw-mt-8">
            {t('page.install.screenshot')}
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export default InstallFinished;
