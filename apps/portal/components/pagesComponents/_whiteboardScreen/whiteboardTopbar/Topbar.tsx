import React from 'react';
import recIcon from 'public/icons/128.png';
const Topbar = () => {
  return (
    <div className="tw-shadow-md tw-px-3 tw-flex tw-items-center tw-justify-between tw-fixed tw-h-60px tw-left-0 tw-top-0 tw-bg-white tw-w-full tw-z-20">
      <div className="tw-flex tw-items-center tw-row">
        <img src={recIcon.src} width={40} />
        <ul className="tw-flex tw-items-center tw-row tw-ml-10px tw-text-sm tw-cursor-pointer">
          <li className="hover:tw-bg-sub-btn tw-px-2 tw-py-1 tw-rounded">
            File
          </li>
          <li className="hover:tw-bg-sub-btn tw-px-2 tw-py-1 tw-rounded">
            Edit
          </li>
          <li className="hover:tw-bg-sub-btn tw-px-2 tw-py-1 tw-rounded">
            View
          </li>
          <li className="hover:tw-bg-sub-btn tw-px-2 tw-py-1 tw-rounded">
            Insert
          </li>
          <li className="hover:tw-bg-sub-btn tw-px-2 tw-py-1 tw-rounded">
            Format
          </li>
          <li className="hover:tw-bg-sub-btn tw-px-2 tw-py-1 tw-rounded">
            Tools
          </li>
          <li className="hover:tw-bg-sub-btn tw-px-2 tw-py-1 tw-rounded">
            Pulsing
          </li>
          <li className="hover:tw-bg-sub-btn tw-px-2 tw-py-1 tw-rounded">
            Help
          </li>
        </ul>
      </div>
      <div></div>
      <div></div>
    </div>
  );
};
export default Topbar;
