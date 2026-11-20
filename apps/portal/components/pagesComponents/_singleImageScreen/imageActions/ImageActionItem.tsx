import classNames from 'classnames';
import React from 'react';

interface IImageActionCardProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  title: string;
  icon: React.FC;
  iconColor?: string;
  outerClassName?: string;
  circleClassName?: string;
  additionalClass?: boolean;
}

// A native button, so it takes keyboard focus, activates on Enter and Space and is announced
// by its visible title. The remaining props (the click, mouse and focus handlers and the class
// name that an antd Dropdown injects into its child) and the ref go to the button, so a
// dropdown can open from it and anchor to it.
const ImageActionItem = React.forwardRef<
  HTMLButtonElement,
  IImageActionCardProps
>(
  (
    {
      title,
      icon,
      outerClassName,
      circleClassName,
      iconColor = 'black',
      additionalClass,
      className,
      ...buttonProps
    },
    ref,
  ) => {
    return (
      <div className={additionalClass ? 'group' : 'group tw-w-full'}>
        <button
          {...buttonProps}
          ref={ref}
          type="button"
          className={classNames(
            className,
            outerClassName,
            `tw-flex tw-flex-col tw-items-center tw-justify-center tw-select-none tw-rounded-md tw-py-13px ${additionalClass ? `tw-w-max` : `tw-w-full`}`,
            'tw-m-0 tw-border-0 tw-bg-transparent tw-text-inherit [font:inherit]',
            'focus-visible:!tw-outline focus-visible:!tw-outline-2 focus-visible:!tw-outline-offset-2 focus-visible:!tw-outline-primary-purple',
          )}
          title={title}
        >
          <span
            aria-hidden="true"
            className={classNames(
              circleClassName,
              'inner-circle tw-rounded-full tw-w-12 tw-h-12 tw-flex tw-items-center tw-justify-center tw-mb-2 tw-cursor-pointer',
            )}
          >
            {React.createElement(
              icon as React.FC<{ size: string; color: string }>,
              { size: '22px', color: iconColor },
            )}
          </span>
          <span className="tw-block tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden tw-w-full tw-px-1 tw-leading-none tw-font-semibold tw-text-sm tw-cursor-pointer tw-text-center">
            {title}
          </span>
        </button>
      </div>
    );
  },
);

ImageActionItem.displayName = 'ImageActionItem';

export default ImageActionItem;
