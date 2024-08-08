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
        'tw-w-full tw-border-solid tw-border-t tw-border-app-grey',
        className,
      )}
    ></div>
  );
};

export default HorizontalDivider;
