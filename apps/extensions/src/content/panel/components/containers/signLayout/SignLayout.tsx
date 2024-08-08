import Logo from '@/content/components/elements/Logo';
import React from 'react';


interface ISignLayoutProps {
  imgPath: string,
}

const SignLayout: React.FC<ISignLayoutProps> = ({imgPath, children}) => {

  return (
    <div className="tw-inline-grid tw-grid-cols-5 tw-p-12 tw-min-h-screen tw-gap-36">
      <div className="tw-col-span-2 tw-bg-light-beige tw-rounded-3xl tw-flex tw-items-center tw-justify-center">
        <img src={imgPath} className="tw-w-full"/>
      </div>
      <div className="tw-col-span-3 tw-pl-20 tw-flex tw-items-center">
        <div>
          <div className="tw-mb-10"><Logo /></div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default SignLayout;