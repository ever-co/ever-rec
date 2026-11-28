import React from 'react';
import recIcon from 'public/icons/128.png';

const menuItemClass =
  'hover:tw-bg-accent hover:tw-text-foreground tw-px-2 tw-py-1 tw-rounded-md tw-transition-colors tw-duration-150';

const Topbar = () => {
  return (
    <div className="tw-px-3 tw-flex tw-items-center tw-justify-between tw-fixed tw-h-60px tw-left-0 tw-top-0 tw-bg-card tw-border-b tw-border-border tw-w-full tw-z-20">
      <div className="tw-flex tw-items-center tw-row">
        <img src={recIcon.src} width={40} />
        <ul className="tw-flex tw-items-center tw-row tw-ml-3 tw-mb-0 tw-text-sm tw-text-muted-foreground tw-cursor-pointer">
          <li className={menuItemClass}>File</li>
          <li className={menuItemClass}>Edit</li>
          <li className={menuItemClass}>View</li>
          <li className={menuItemClass}>Insert</li>
          <li className={menuItemClass}>Format</li>
          <li className={menuItemClass}>Tools</li>
          <li className={menuItemClass}>Pulsing</li>
          <li className={menuItemClass}>Help</li>
        </ul>
      </div>
      <div></div>
      <div></div>
    </div>
  );
};
export default Topbar;
