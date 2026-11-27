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
      <div className="tw-w-full">
        <AppHeader
          part1={t('common.setup')}
          part2={t('common.finished')}
          textSize="2xl"
          className="tw-mb-2"
        />
        <div>
          <div className="tw-flex tw-flex-col tw-gap-1 tw-text-sm tw-text-muted-foreground">
            <p className="tw-m-0">{t('page.install.completedGuide')}</p>
            <p className="tw-m-0">
              {t('page.install.clickRightSideExtension')}
            </p>
            <p className="tw-m-0">{t('page.install.belowScreenShotButton')}</p>
          </div>

          <div className="tw-mt-6 tw-h-60 tw-overflow-hidden tw-rounded-lg tw-border tw-border-solid tw-border-border">
            <img
              className="tw-w-full"
              src="/sign/setup_finished_screen_guide.png"
            />
          </div>
          <AppButton
            onClick={makeScreenshotHandler}
            full
            twPadding="tw-px-4"
            className="tw-mt-6 tw-flex tw-h-10 tw-items-center tw-justify-center"
          >
            {t('page.install.screenshot')}
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export default InstallFinished;
