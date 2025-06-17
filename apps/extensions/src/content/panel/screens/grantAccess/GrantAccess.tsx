import React, { useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';

async function getBothSources() {
  try {
    await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
  } catch (err) {
    console.log(err);
    const error = err as Error;
    if (error.message.endsWith('Requested device not found')) {
      await getSources({ video: true });
      await getSources({ audio: true });
    }
  }
}

async function getSources(constraint: MediaStreamConstraints) {
  const camera = constraint?.video ? 'Camera' : '';
  const audio = constraint?.audio ? 'Audio' : '';

  try {
    await navigator.mediaDevices.getUserMedia(constraint);
  } catch (err) {
    console.log(`${err}: ${camera}${audio}`);
  }
}

const GrantAccess: React.FC = () => {
  const { t } = useTranslation();
  useEffect(() => {
    getBothSources();
  }, []);

  return (
    <div className="tw-w-3/5 tw-m-auto tw-pt-96">
      <img
        className="tw-absolute tw-top-32 tw-ml-8"
        src="/images/contentImages/allow.svg"
      />
      <div>
        <p className="tw-text-center tw-font-roboto tw-font-medium tw-mt-16">
          <Trans
            i18nKey="ext.page.access.popupMissed"
            components={{ 1: <b /> }}
          />
          <br />
          <Trans
            i18nKey="ext.page.access.alternativeAction"
            components={{
              0: (
                <span className="tw-bg-camera-icon tw-w-5 tw-h-5 tw-inline-block tw-align-middle tw-bg-no-repeat tw-mx-2" />
              ),
              1: <b />,
            }}
          />
          <br />
          {t('ext.page.access.seeInstructions')}
          <br />
          {t('ext.page.access.refreshCheck')}
        </p>
        <img
          className="tw-m-auto"
          src={`${process.env.STATIC_FILES_URL}/images/gifs/grant-access.gif`}
        />
      </div>
    </div>
  );
};

export default GrantAccess;
