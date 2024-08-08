import classNames from 'classnames';
import React from 'react';

interface props {
  className?: string;
  children: React.ReactNode;
}
const ImageActionsCard: React.FC<props> = ({ children, className = '' }) => {
  return (
    <div
      className={classNames(
        'tw-rounded-2lg tw-bg-white tw-shadow-app-blocks tw-p-5 tw-mb-3 tw-overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ImageActionsCard;
