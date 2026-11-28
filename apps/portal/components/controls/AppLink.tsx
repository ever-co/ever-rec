import classNames from 'classnames';
import React from 'react';

interface IAppLinkProps {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

const AppLink: React.FC<IAppLinkProps> = ({ onClick, children, className }) => {
  return (
    <div
      className={classNames(
        'tw-cursor-pointer tw-font-medium tw-text-brand-text tw-underline-offset-4 hover:tw-underline',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default AppLink;
