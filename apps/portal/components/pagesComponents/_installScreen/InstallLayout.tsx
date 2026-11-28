import React from 'react';
import LogoWrapper from 'components/elements/LogoWrapper';
import StepNumber from './components/stepNumber/StepNumber';

interface IInstallLayoutProps {
  imgPath: string;
  currentStep: number;
  hasNextStep: boolean;
  onSkipStep: () => void;
  children: React.ReactNode;
}

const InstallLayout: React.FC<IInstallLayoutProps> = ({
  imgPath,
  currentStep,
  hasNextStep,
  children,
}) => {
  return (
    <div className="tw-grid tw-min-h-screen tw-w-full tw-grid-cols-2 tw-gap-4 tw-bg-background tw-p-4 mx-lg:tw-grid-cols-1">
      <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-px-4 tw-py-16">
        <div className="tw-w-full tw-max-w-[24rem]">
          <LogoWrapper />
          {children}
          {currentStep > 0 && (
            <div className="tw-flex tw-w-full">
              <StepNumber step={currentStep} hasNextStep={hasNextStep} />
            </div>
          )}
        </div>
      </div>
      <div className="tw-flex tw-items-center tw-justify-center tw-rounded-[0.75rem] tw-bg-muted mx-lg:tw-hidden">
        <img className="tw-w-8/12" src={imgPath} />
      </div>
    </div>
  );
};

export default InstallLayout;
