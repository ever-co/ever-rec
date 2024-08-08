import AppButton from '@/content/components/controls/appButton/AppButton';
import AppHeader from '@/content/components/elements/AppHeader';
import React from 'react';
import { IStepProps } from './steps';


const InstallPinn: React.FC<IStepProps> = ({ nextStep }) => {
  return (
    <div className="tw-w-full">
      <div className="tw-w-96">
        <AppHeader part1="Pin" part2="Extention" className="tw-mb-8" />
        <div>
          <p>
            To make accessing the extension easier, please let it remain pinned
            by following steps below.
          </p>
          <ol className="tw-list-decimal tw-ml-8 tw-mb-6">
            <li>Click the puzzle icon next to your profile</li>
            <li>In the drop-down menu, find Rec</li>
            <li>Click the pushpin icon until it turns blue</li>
          </ol>
          <div className="tw-shadow-lg tw-rounded-xl tw-overflow-hidden tw-h-60">
            <img
              className="tw-h-full"
              src={`${process.env.STATIC_FILES_URL}/images/gifs/pin_extention_screen_guide.gif`}
            />
          </div>
          <AppButton onClick={nextStep} full className="tw-mt-8">
            Pinned
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export default InstallPinn;
