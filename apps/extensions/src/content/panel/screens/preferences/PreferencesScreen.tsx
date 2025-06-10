import { appLogger } from '@/app/AppLogger';
import IPreferences, { ImageExtention } from '@/app/interfaces/IPreferences';
import { getPreferences, setPreferences } from '@/app/services/auth';
import { useErrorHandler } from '@/app/services/helpers/errors';
import browser from '@/app/utilities/browser';
import { imagesPath } from '@/app/utilities/common';
import AppHeader from '@/content/components/elements/AppHeader';
import AppSvg from '@/content/components/elements/AppSvg';
import AppSwitch from '@/content/components/elements/AppSwitch';
import { Radio } from 'antd';
import React, { useEffect, useState } from 'react';
// import { BiArrowBack } from 'react-icons/bi';
import { useNavigate } from 'react-router';
import { panelRoutes } from '../../router/panelRoutes';
import PreferencePartition from './PreferencePartition';
import SavePathInput from './SavePathInput';
import { useTranslation } from 'react-i18next';

const PreferencesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { errorHandler } = useErrorHandler();
  const [preferences, setPreferencesState] = useState<IPreferences>({
    imageExt: 'png',
    showSharedGDriveLink: false,
    defaultSave: true,
    defaultSavePath: '',
    addInfoOnTop: false,
  });

  useEffect(() => {
    appLogger.add({ eventType: 'UserOpenedTheirProfileSettings' });
    (async function () {
      try {
        const pref: any | undefined = await getPreferences();
        pref && setPreferencesState(pref);
      } catch (e: any) {
        errorHandler(e);
      }
    })();
  }, []);

  const updatePreference = (field: string, value: any) => {
    const pref = {
      ...preferences,
      [field]: value,
    };
    setPreferencesState(pref);
    setPreferences(pref);
  };

  const allowImageExts: ImageExtention[] = ['png', 'jpg'];

  const navigateToMainScreen = async () => {
    await browser.tabs.update({
      url: panelRoutes.images.path,
    });
  };

  return (
    <div className="tw-inline-grid tw-grid-cols-7 tw-p-4 tw-min-h-screen tw-w-screen tw-gap-36">
      <div className="tw-col-span-3 tw-col-start-2 tw-flex">
        <div>
          <div
            className="tw-flex tw-items-center tw-cursor-pointer tw-mt-10 tw-mb-20"
            onClick={navigateToMainScreen}
          >
            <AppSvg
              path="images/panel/common/arrow_back-light.svg"
              size={18 + 'px'}
              className="tw-mr-2"
            />
            {t('navigation.back')}
          </div>
          <AppHeader
            part1={t('page.preference.saving')}
            part2={t('page.preference.preferences')}
            className="tw-mb-10"
          />
          <PreferencePartition hasUpperDivider={false}>
            <div className="tw-flex tw-justify-between">
              <div className="tw-font-semibold">
                {t('page.preference.downloadAs')}
              </div>
              <div className="tw-flex">
                <Radio.Group
                  onChange={(e) => updatePreference('imageExt', e.target.value)}
                  value={preferences.imageExt}
                >
                  {allowImageExts.map((ext) => (
                    <Radio key={ext} value={ext}>
                      {ext.toUpperCase()}
                    </Radio>
                  ))}
                </Radio.Group>
              </div>
            </div>
          </PreferencePartition>

          <PreferencePartition>
            <div className="tw-flex tw-justify-between tw-items-center">
              <div className="tw-font-semibold tw-mr-2">
                {t('page.preference.alwaysGetLink')}
              </div>
              <AppSwitch
                checked={preferences.showSharedGDriveLink}
                onChange={(value: boolean) =>
                  updatePreference('showSharedGDriveLink', value)
                }
              ></AppSwitch>
            </div>
          </PreferencePartition>

          <PreferencePartition>
            <div>
              <div className="tw-flex tw-justify-between tw-items-center">
                <div className="tw-font-semibold tw-mr-2">
                  {t('page.preference.saveEachFile')}
                </div>
                <AppSwitch
                  checked={preferences.defaultSave}
                  onChange={(value: boolean) =>
                    updatePreference('defaultSave', value)
                  }
                ></AppSwitch>
              </div>
              <div className="tw-my-5">
                {t('page.preference.saveEachFileDescription')}
              </div>
              <SavePathInput
                value={preferences.defaultSavePath}
                onChange={(value) => updatePreference('defaultSavePath', value)}
              />
            </div>
          </PreferencePartition>

          <PreferencePartition>
            <div className="tw-flex tw-justify-between tw-items-center">
              <div className="tw-font-semibold tw-mr-2">
                {t('page.preference.addDateAndUrl')}
              </div>
              <AppSwitch
                checked={preferences.addInfoOnTop}
                onChange={(value: boolean) =>
                  updatePreference('addInfoOnTop', value)
                }
              ></AppSwitch>
            </div>
          </PreferencePartition>
        </div>
      </div>
      <div className="tw-relative tw-col-span-3 tw-bg-blue-grey tw-rounded-3xl tw-flex tw-items-center tw-justify-center">
        <img
          src={`${imagesPath}/panel/preferences/preferences.png`}
          className="tw-w-8/12"
        />
      </div>
    </div>
  );
};

export default PreferencesScreen;
