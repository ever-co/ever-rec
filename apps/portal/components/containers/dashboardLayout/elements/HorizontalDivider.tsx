import classNames from 'classnames';
import React from 'react';

interface IHorizontalDividerProps {
  className?: string;
}

const HorizontalDivider: React.FC<IHorizontalDividerProps> = ({
  className,
}) => {
  return (
    <div
      className={classNames(
        'tw-w-full tw-border-0 tw-border-solid tw-border-t tw-border-border',
        className,
      )}
    ></div>
  );
};

export default HorizontalDivider;
