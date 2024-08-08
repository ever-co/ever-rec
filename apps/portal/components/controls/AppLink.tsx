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
        'tw-text-blue tw-font-semibold tw-cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default AppLink;
