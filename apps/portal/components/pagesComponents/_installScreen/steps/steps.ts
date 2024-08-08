import InstallFinished from './InstallFinished';
import InstallPinn from './InstallPinn';
import InstallSign from './InstallSign';

export type StepNames = 'InstallSign' | 'InstallPinn' | 'InstallFinished';

export interface ISignStep {
  name: StepNames;
  component: React.FC<IStepProps>;
  imgPath: string;
  stepNumber: number;
}

export interface IStepProps {
  nextStep: () => void;
}

export const signSteps: Record<StepNames, ISignStep> = {
  InstallSign: {
    name: 'InstallSign',
    component: InstallSign,
    imgPath: './sign/signin1.svg',
    stepNumber: 0,
  },
  InstallPinn: {
    name: 'InstallPinn',
    component: InstallPinn,
    imgPath: './sign/pin_extention_screen.svg',
    stepNumber: 1,
  },
  InstallFinished: {
    name: 'InstallFinished',
    component: InstallFinished,
    imgPath: './sign/setup_finished_screen.svg',
    stepNumber: 2,
  },
};
