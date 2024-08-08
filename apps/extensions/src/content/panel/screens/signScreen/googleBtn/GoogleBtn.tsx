import React from 'react';
import { ReactSVG } from 'react-svg';


interface IGoogleBtnProps {
  onClick: () => void;
}

const GoogleBtn: React.FC<IGoogleBtnProps> = (({ onClick }) => {
  return (
    <div
    className="tw-flex tw-py-2 tw-w-full tw-border tw-items-center tw-justify-center tw-border-app-grey tw-rounded-md tw-cursor-pointer hover:tw-bg-app-grey hover:tw-bg-opacity-10"
    onClick={onClick}
    ><ReactSVG src={chrome.runtime.getURL("./images/panel/sign/google.svg")}/>
      <div className="tw-font-semibold tw-text-sm tw-ml-2 tw-text-dark-blue2">Continue with Google</div>
    </div>
  );
});

export default GoogleBtn;
