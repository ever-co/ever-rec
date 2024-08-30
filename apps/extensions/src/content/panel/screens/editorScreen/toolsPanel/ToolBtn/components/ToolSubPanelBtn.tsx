import classNames from 'classnames';
import React from 'react';
import { Tooltip } from 'antd';
// import { IconContext } from 'react-icons';
interface IToolSubPanelBtn {
  icon: string;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  toolTitle?: string;
}

const ToolSubPanelBtn: React.FC<IToolSubPanelBtn> = ({
  icon,
  disabled,
  active,
  onSelect,
  toolTitle,
}) => {
  const clickHandler = () => {
    !disabled && onSelect();
  };

  return (
    <div
      className={classNames(
        'tw-w-10 tw-h-10 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-cursor-pointer tw-mx-1  tw-border-solid tw-border-2 tw-border-white tw-transition-all ',
        disabled ? 'tw-opacity-30' : 'tw-opacity-100',
        active
          ? 'tw-ghost-white tw-bg-purple-active'
          : 'tw-bg-transparent tw-border-trans hover:tw-bg-sub-btn hover:tw-border-white ',
      )}
      onClick={clickHandler}
    >
      <Tooltip title={toolTitle}>
        <div
          className={classNames(
            !active
              ? 'tw-text-black tw-p-5px '
              : 'tw-text-white tw-bg-purple2 tw-p-5px',
          )}
        >
          {/* <IconContext.Provider
          value={{
            style: { strokeWidth: '0.5' },
          }}
        > */}
          <div className="tw-flex tw-items-center tw-justify-center">
            <img src={icon} />
          </div>
          {/* </IconContext.Provider> */}
        </div>
      </Tooltip>
    </div>
  );
};

export default ToolSubPanelBtn;
