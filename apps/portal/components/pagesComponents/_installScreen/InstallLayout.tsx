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
    <div className="tw-inline-grid tw-grid-cols-7 tw-p-4 tw-min-h-screen tw-w-screen tw-gap-36">
      <div className="tw-col-span-3 tw-col-start-2 tw-flex tw-flex-col">
        <div className="tw-flex-1">
          <LogoWrapper />
          {children}
          {currentStep > 0 && (
            <div className="tw-flex tw-w-96">
              <StepNumber step={currentStep} hasNextStep={hasNextStep} />
            </div>
          )}
        </div>
      </div>
      <div className="tw-col-span-3 tw-bg-blue-grey tw-rounded-3xl tw-flex tw-items-center tw-justify-center">
        <img className="tw-w-8/12" src={imgPath} />
      </div>
    </div>
  );
};

export default InstallLayout;
