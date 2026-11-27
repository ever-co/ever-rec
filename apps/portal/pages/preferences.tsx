import IPreferences, { ImageExtention } from 'app/interfaces/IPreferences';
import { getPreferences, setPreferences } from 'app/services/auth';
import { errorHandler } from 'app/services/helpers/errors';
import AppHeader from 'components/elements/AppHeader';
import AppSvg from 'components/elements/AppSvg';
import AppSwitch from 'components/elements/AppSwitch';
import { Radio } from 'antd';
import React, { useEffect, useState } from 'react';
import PreferencePartition from '../components/pagesComponents/_preferencesScreen/PreferencePartition';
import SavePathInput from '../components/pagesComponents/_preferencesScreen/SavePathInput';
import { panelRoutes, preRoutes } from 'components/_routes';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';

// One setting: its label on the left, its control on the right.
const ROW = 'tw-flex tw-items-center tw-justify-between tw-gap-6';
const ROW_LABEL = 'tw-text-sm tw-font-medium tw-text-foreground';

const Preferences: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [preferences, setPreferencesState] = useState<IPreferences>({
    imageExt: 'png',
    showSharedGDriveLink: false,
    defaultSave: true,
    defaultSavePath: '',
    addInfoOnTop: false,
  });

  useEffect(() => {
    (async function () {
      try {
        const pref: IPreferences | undefined = await getPreferences();
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

  return (
    <div className="tw-grid tw-min-h-screen tw-w-full tw-grid-cols-2 tw-gap-4 tw-bg-background tw-p-4 mx-lg:tw-grid-cols-1">
      <div className="tw-flex tw-justify-center tw-px-4 tw-py-8">
        <div className="tw-w-full tw-max-w-xl">
          <div
            className="-tw-ms-3 tw-mb-8 tw-flex tw-h-9 tw-w-max tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-px-3 tw-text-sm tw-font-medium tw-text-foreground tw-transition-colors tw-duration-150 hover:tw-bg-accent"
            onClick={() => router.push(preRoutes.media + panelRoutes.images)}
          >
            <AppSvg
              path="/common/arrow_back-light.svg"
              size={16 + 'px'}
              className="tw-text-muted-foreground rtl:-tw-scale-x-100"
            />
            {t('navigation.back')}
          </div>
          <AppHeader
            part1={t('page.preference.saving')}
            part2={t('page.preference.preferences')}
            textSize="2xl"
            className="tw-mb-6"
          />
          <PreferencePartition hasUpperDivider={false}>
            <div className={ROW}>
              <div className={ROW_LABEL}>{t('page.preference.downloadAs')}</div>
              <div className="tw-flex tw-shrink-0">
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
            <div className={ROW}>
              <div className={ROW_LABEL}>
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
              <div className={ROW}>
                <div className={ROW_LABEL}>
                  {t('page.preference.saveEachFile')}
                </div>
                <AppSwitch
                  checked={preferences.defaultSave}
                  onChange={(value: boolean) =>
                    updatePreference('defaultSave', value)
                  }
                ></AppSwitch>
              </div>
              <div className="tw-mb-4 tw-mt-2 tw-text-[13px] tw-leading-5 tw-text-muted-foreground">
                {t('page.preference.saveEachFileDescription')}
              </div>
              <SavePathInput
                value={preferences.defaultSavePath}
                onChange={(value) => updatePreference('defaultSavePath', value)}
              />
            </div>
          </PreferencePartition>

          <PreferencePartition>
            <div className={ROW}>
              <div className={ROW_LABEL}>
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
      <div className="tw-relative tw-flex tw-items-center tw-justify-center tw-rounded-[0.75rem] tw-bg-muted mx-lg:tw-hidden">
        {/*
          A full-colour drawing with black line: flipping it for the dark theme muddies its
          colours, so there it sits on a light plate instead.
        */}
        <div className="tw-w-8/12 dark:tw-rounded-2xl dark:tw-bg-primary dark:tw-p-6">
          <img
            src={`/preferences/preferences.png`}
            alt=""
            className="tw-block tw-w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default Preferences;
