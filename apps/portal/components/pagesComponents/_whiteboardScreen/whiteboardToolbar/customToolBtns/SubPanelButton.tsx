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
        'tw-flex tw-items-center tw-rounded-md tw-cursor-pointer tw-transition-colors tw-duration-150',
        props.disabled ? 'tw-opacity-30' : 'tw-opacity-100',
        props.active
          ? 'tw-bg-brand-muted tw-text-brand-text'
          : 'tw-bg-transparent tw-text-foreground hover:tw-bg-accent',
      )}
      onClick={clickHandler}
    >
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-h-9 tw-w-60 tw-px-3">
        <div
          className={classNames(
            `tw-flex tw-items-center tw-justify-start tw-gap-2 tw-cursor-pointer`,
          )}
        >
          <AppSvg
            path={props.icon.src}
            width={props.iconWidth ? props.iconWidth + 'px' : 20 + 'px'}
            height={props.iconHeight ? props.iconHeight + 'px' : 20 + 'px'}
            className={props.active ? undefined : 'tw-text-muted-foreground'}
          />
          <p className="tw-m-0 tw-text-sm">{props.title}</p>
        </div>
        <p className="tw-m-0 tw-text-xs tw-text-muted-foreground">
          {props.shortcut}
        </p>
      </div>
    </div>
  );
};

export default SubPanelButton;
