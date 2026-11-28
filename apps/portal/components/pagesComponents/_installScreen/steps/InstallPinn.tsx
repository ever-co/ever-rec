import AppButton from 'components/controls/AppButton';
import AppHeader from 'components/elements/AppHeader';
import React from 'react';
import { IStepProps } from './steps';
import { useTranslation } from 'react-i18next';

const InstallPinn: React.FC<IStepProps> = ({ nextStep }) => {
  const { t } = useTranslation();
  return (
    <div className="tw-w-full">
      <div className="tw-w-full">
        <AppHeader
          part1={t('common.pin')}
          part2={t('common.extension')}
          textSize="2xl"
          className="tw-mb-2"
        />
        <div>
          <p className="tw-m-0 tw-text-sm tw-text-muted-foreground">
            {t('page.install.remainPinned')}
          </p>

          <ol className="tw-mb-6 tw-ms-5 tw-mt-2 tw-list-decimal tw-text-sm tw-text-foreground">
            <li>{t('page.install.clickPuzzle')}</li>
            <li>{t('page.install.clickRec')}</li>
            <li>{t('page.install.clickPin')}</li>
          </ol>
          <div className="tw-h-60 tw-overflow-hidden tw-rounded-lg tw-border tw-border-solid tw-border-border">
            <img
              className="tw-h-full"
              src={`${process.env.STATIC_FILES_URL}/images/gifs/pin_extention_screen_guide.gif`}
            />
          </div>
          <AppButton
            onClick={nextStep}
            full
            twPadding="tw-px-4"
            className="tw-mt-6 tw-flex tw-h-10 tw-items-center tw-justify-center"
          >
            {t('page.install.pinned')}
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export default InstallPinn;
