import classNames from 'classnames';
import React from 'react';

interface IImageActionCardProps {
  title: string;
  icon: React.FC;
  iconColor?: string;
  outerClassName?: string;
  circleClassName?: string;
  onClick?: () => void;
  additionalClass?: boolean;
}

const ImageActionItem: React.FC<IImageActionCardProps> = ({
  title,
  icon,
  outerClassName,
  circleClassName,
  iconColor = 'black',
  onClick,
  additionalClass,
}) => {
  return (
    <div className={additionalClass ? 'group' : 'group tw-w-full'}>
      <div
        className={classNames(
          outerClassName,
          `tw-flex tw-flex-col tw-items-center tw-justify-center tw-select-none tw-rounded-md tw-py-13px ${additionalClass ? `tw-w-max` : `tw-w-full`}`,
        )}
        onClick={onClick}
        title={title}
      >
        <div
          className={classNames(
            circleClassName,
            'inner-circle tw-rounded-full tw-w-12 tw-h-12 tw-flex tw-items-center tw-justify-center tw-mb-2 tw-cursor-pointer',
          )}
        >
          {React.createElement(
            icon as React.FC<{ size: string; color: string }>,
            { size: '22px', color: iconColor },
          )}
        </div>
        <div className="tw-whitespace-nowrap tw-text-ellipsis tw-overflow-hidden tw-w-full tw-px-1 tw-leading-none tw-font-semibold tw-text-sm tw-cursor-pointer tw-text-center">
          {title}
        </div>
      </div>
    </div>
  );
};

export default ImageActionItem;
