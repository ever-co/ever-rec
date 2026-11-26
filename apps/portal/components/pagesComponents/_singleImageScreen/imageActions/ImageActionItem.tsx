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
      iconColor = 'currentColor',
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
            // An outline button, 36px high: a quiet icon, then the label.
            `tw-flex tw-h-9 tw-items-center tw-justify-center tw-gap-1.5 tw-select-none tw-rounded-md tw-px-2 ${additionalClass ? `tw-w-max` : `tw-w-full`}`,
            'tw-m-0 tw-border tw-border-solid tw-border-input tw-bg-transparent tw-text-foreground [font:inherit] tw-transition-colors tw-duration-150 hover:tw-bg-accent',
            'focus-visible:!tw-outline focus-visible:!tw-outline-2 focus-visible:!tw-outline-offset-2 focus-visible:!tw-outline-ring',
          )}
          title={title}
        >
          <span
            aria-hidden="true"
            className={classNames(
              circleClassName,
              'inner-circle tw-flex tw-shrink-0 tw-items-center tw-justify-center tw-cursor-pointer',
            )}
          >
            {React.createElement(
              icon as React.FC<{ size: string; color: string }>,
              { size: '16px', color: iconColor },
            )}
          </span>
          <span className="tw-block tw-min-w-0 tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden tw-leading-5 tw-font-medium tw-text-[13px] tw-cursor-pointer tw-text-center">
            {title}
          </span>
        </button>
      </div>
    );
  },
);

ImageActionItem.displayName = 'ImageActionItem';

export default ImageActionItem;
