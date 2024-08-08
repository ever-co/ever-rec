import classNames from 'classnames';
import React from 'react';
import './tools-subpanel.scss';

interface IToolSubPanelProp {
  className?: string;
}

const ToolSubPanel: React.FC<IToolSubPanelProp> = ({ className, children }) => {
  return (
    <div
      className={classNames(
        'tw-text-black tw-p-20px tools-subpanel ',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ToolSubPanel;
