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
        // A section of the manage column: no ground of its own, a hairline between sections.
        'tw-border-0 tw-border-b tw-border-solid tw-border-border tw-p-4 tw-text-sm last:tw-border-b-0',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ImageActionsCard;
