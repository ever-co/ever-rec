import classNames from 'classnames';
import React from 'react';
import AppSvg from 'components/elements/AppSvg';

interface ISubPanelButton {
  icon: any;
  iconWidth?: number;
  iconHeight?: number;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title?: string;
  shortcut?: string;
}

const SubPanelButton = (props: ISubPanelButton) => {
  const clickHandler = () => {
    !props.disabled && props.onSelect();
  };

  return (
    <div
      className={classNames(
        'tw-w-70 tw-h-13 tw-flex tw-items-center tw-cursor-pointer tw-transition-all tw-p-12px',
        props.disabled ? 'tw-opacity-30' : 'tw-opacity-100',
        props.active
          ? 'tw-ghost-white tw-bg-primary-violet'
          : 'tw-bg-transparent hover:tw-bg-sub-btn',
      )}
      onClick={clickHandler}
    >
      <div
        className={classNames(
          'hover:tw-text-black tw-bg-transparent tw-flex tw-items-center tw-justify-around tw-h-60px tw-w-60 tw-px-4',
          props.active
            ? 'tw-bg-primary-violet tw-text-black'
            : 'tw-text-grey-dark2',
        )}
      >
        <div
          className={classNames(
            `tw-h-60px tw-w-60 tw-w-full tw-flex tw-items-center tw-justify-start tw-cursor-pointer tw-transition-all tw-duration-100 `,
          )}
        >
          <AppSvg
            path={props.icon.src}
            width={props.iconWidth ? props.iconWidth + 'px' : 20 + 'px'}
            height={props.iconHeight ? props.iconHeight + 'px' : 20 + 'px'}
          />
          <p className="tw-ml-2 tw-font-medium">{props.title}</p>
        </div>
        <p>{props.shortcut}</p>
      </div>
    </div>
  );
};

export default SubPanelButton;
