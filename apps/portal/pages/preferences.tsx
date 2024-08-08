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

const Preferences: React.FC = () => {
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
    <div className="tw-inline-grid tw-grid-cols-7 tw-p-4 tw-min-h-screen tw-w-screen tw-gap-36">
      <div className="tw-col-span-3 tw-col-start-2 tw-flex">
        <div>
          <div
            className="tw-flex tw-items-center tw-cursor-pointer tw-mt-10 tw-mb-20"
            onClick={() => router.push(preRoutes.media + panelRoutes.images)}
          >
            <AppSvg
              path="/common/arrow_back-light.svg"
              size={18 + 'px'}
              className="tw-mr-2"
            />
            Back
          </div>
          <AppHeader part1="Saving" part2="Preferences" className="tw-mb-10" />
          <PreferencePartition hasUpperDivider={false}>
            <div className="tw-flex tw-justify-between">
              <div className="tw-font-semibold">Download Screenshot As</div>
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
                Always get shareable links for screenshots uploaded to Google
                Drive
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
                  Ask where to save each file before downloading
                </div>
                <AppSwitch
                  checked={preferences.defaultSave}
                  onChange={(value: boolean) =>
                    updatePreference('defaultSave', value)
                  }
                ></AppSwitch>
              </div>
              <div className="tw-my-5">
                Note: to use this feature, you need to Allow the extension to
                manage Downloads when permission request window pops up. And
                only when this option is turned on, can you specify default
                subfolder to save screenshots to your local disk. Defaults to
                the Downloads folder if you don\’t specify a subfolder.
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
                Add Date and URL at the top of a screenshot
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
        <img src={`/preferences/preferences.png`} className="tw-w-8/12" />
      </div>
    </div>
  );
};

export default Preferences;
