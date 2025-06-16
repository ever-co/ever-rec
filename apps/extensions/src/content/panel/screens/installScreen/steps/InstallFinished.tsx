import { AppMessagesEnum } from '@/app/messagess';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppHeader from '@/content/components/elements/AppHeader';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import React, { useState } from 'react';
import { IStepProps } from './steps';
import { useTranslation } from 'react-i18next';

const InstallFinished: React.FC<IStepProps> = () => {
  const { t } = useTranslation();
  const [disabled, setDisabled] = useState(false);

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
        <AppHeader
          part1={t('common.setup')}
          part2={t('common.finished')}
          className="tw-mb-8"
        />
        <div>
          <p>{t('page.install.completedGuide')}</p>
          <p>{t('page.install.clickRightSideExtension')}</p>
          <p>{t('page.install.belowScreenShotButton')}</p>
          <div className="tw-shadow-lg tw-rounded-xl tw-overflow-hidden tw-h-60">
            <img
              className="tw-w-full"
              src="/images/panel/sign/setup_finished_screen_guide.png"
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
