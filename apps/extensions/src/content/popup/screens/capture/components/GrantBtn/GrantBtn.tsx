import React from 'react';
import browser from '@/app/utilities/browser';
import { panelRoutes } from '@/content/panel/router/panelRoutes';

const GrantBtn: React.FC = () => {
  const clickHandler = () => {
    browser.tabs.create({
      url: browser.runtime.getURL(panelRoutes.grant.path),
    });
  };

  return (
    <div
      className="
            tw-text-white
            tw-bg-primary-purple 
            tw-w-64 
            tw-py-2 
            tw-px-5 
            tw-font-semibold 
            tw-cursor-pointer 
            tw-select-none 
            tw-rounded-md 
            tw-text-base 
            tw-text-center
            tw-text-sm"
      onClick={clickHandler}
    >
      Grant Access
    </div>
  );
};

export default GrantBtn;
