import React, { useEffect, useState } from 'react';
import InstallLayout from './InstallLayout';
import { ISignStep, IStepProps, signSteps } from './steps/steps';


const InstallScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ISignStep>(
    signSteps.InstallPinn,
  );
  const [hasNextStep, setHasNextStep] = useState<boolean>(false);

  const getNextStep = (step: ISignStep) => {
    return Object.values(signSteps).find((value: ISignStep) => {
      return value.stepNumber === step.stepNumber + 1;
    });
  };

  const nextStepHandler = () => {
    const step = getNextStep(currentStep);
    step && setCurrentStep(step);
  };

  useEffect(() => {
    const nextStep = getNextStep(currentStep);

    if (nextStep) return setHasNextStep(true);

    setHasNextStep(false);
  }, [currentStep]);

  return (
    <InstallLayout
      imgPath={currentStep.imgPath}
      currentStep={currentStep.stepNumber}
      hasNextStep={hasNextStep}
      onSkipStep={nextStepHandler}
    >
      {React.createElement<IStepProps>(currentStep.component, {
        nextStep: nextStepHandler,
      })}
    </InstallLayout>
  );
};

export default InstallScreen;
