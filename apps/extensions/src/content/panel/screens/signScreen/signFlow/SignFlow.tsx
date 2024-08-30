import { googleAuthorization } from '@/app/services/auth';
import AppLink from '@/content/components/controls/appLink/AppLink';
import React, { useState } from 'react';
import { ReactSVG } from 'react-svg';
import GoogleBtn from '../googleBtn/GoogleBtn';
import LinksDivider from './linksDivider/LinksDivider';
import PanelLogin from './PanelLogin';
import PanelRegister from './PanelRegister';
import PanelResetPassword from './PanelResetPassword';

type SignFlowName = 'login' | 'register' | 'resetPassword';

interface FlowLink {
  name: SignFlowName;
  title: string;
}

const SignFlow: React.FC = () => {
  const [currentFlow, setcurrentFlow] = useState<SignFlowName>('login');

  const flowLinks: FlowLink[] = [
    {
      name: 'login',
      title: 'I already have account',
    },
    {
      name: 'register',
      title: 'Create an account',
    },
    {
      name: 'resetPassword',
      title: 'I forgot password',
    },
  ];

  const googleAuth = (): void => {
    googleAuthorization();
  };

  const filteredLinks = (): FlowLink[] => {
    return flowLinks.filter((link) => link.name !== currentFlow);
  };

  return (
    <div className="">
      {currentFlow === 'login' ? (
        <PanelLogin />
      ) : currentFlow === 'register' ? (
        <PanelRegister />
      ) : (
        <PanelResetPassword />
      )}
      <div className="tw-text-center tw-my-7 tw-flex tw-justify-center">
        <ReactSVG
          src="./images/panel/sign/or_separator.svg"
          className="tw-w-min"
        />
      </div>
      <GoogleBtn onClick={googleAuth} />
      <div className="tw-flex tw-justify-center tw-mt-7">
        {filteredLinks().map((link, index, arr) => (
          <React.Fragment key={`link_${index}`}>
            {currentFlow !== link.name && (
              <AppLink onClick={() => setcurrentFlow(link.name)}>
                {link.title}
              </AppLink>
            )}
            {index < arr.length - 1 && <LinksDivider />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default SignFlow;
