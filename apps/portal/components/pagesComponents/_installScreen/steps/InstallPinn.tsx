import AppButton from 'components/controls/AppButton';
import AppHeader from 'components/elements/AppHeader';
import React from 'react';
import { IStepProps } from './steps';
import { useTranslation } from 'react-i18next';

const InstallPinn: React.FC<IStepProps> = ({ nextStep }) => {
  const { t } = useTranslation();
  return (
    <div className="tw-w-full">
      <div className="tw-w-96">
        <AppHeader
          part1={t('common.pin')}
          part2={t('common.extension')}
          className="tw-mb-8"
        />
        <div>
          <p>{t('page.install.remainPinned')}</p>

          <ol className="tw-list-decimal tw-ml-8 tw-mb-6">
            <li>{t('page.install.clickPuzzle')}</li>
            <li>{t('page.install.clickRec')}</li>
            <li>{t('page.install.clickPin')}</li>
          </ol>
          <div className="tw-shadow-lg tw-rounded-xl tw-overflow-hidden tw-h-60">
            <img
              className="tw-h-full"
              src={`${process.env.STATIC_FILES_URL}/images/gifs/pin_extention_screen_guide.gif`}
            />
          </div>
          <AppButton onClick={nextStep} full className="tw-mt-8">
            {t('page.install.pinned')}
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export default InstallPinn;
