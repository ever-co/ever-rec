import { AppMessagesEnum } from '@/app/messagess';
import AppButton from '@/content/components/controls/appButton/AppButton';
import AppHeader from '@/content/components/elements/AppHeader';
import { sendRuntimeMessage } from '@/content/utilities/scripts/sendRuntimeMessage';
import React, { useState } from 'react';
import { IStepProps } from './steps';

const InstallFinished: React.FC<IStepProps> = () => {
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
        <AppHeader part1="Setup" part2="Finished!" className="tw-mb-8" />
        <div>
          <p>You are all set to capture your screen!</p>
          <p>
            Click the extension icon on the right side of the address bar to
            start using this tool.
          </p>
          <p>Or click the button below to make a screenshot right now!</p>
          <div className="tw-shadow-lg tw-rounded-xl tw-overflow-hidden tw-h-60">
            <img
              className="tw-w-full"
              src="/images/panel/sign/setup_finished_screen_guide.png"
            />
          </div>
          <AppButton onClick={makeScreenshotHandler} full className="tw-mt-8">
            Screenshot
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export default InstallFinished;
