import classNames from 'classnames';
import React from 'react';
import styles from './tools-subpanel.module.scss';

interface IToolSubPanelProp {
  className?: string;
  children?: React.ReactNode;
}

const ToolSubPanel: React.FC<IToolSubPanelProp> = ({ className, children }) => {
  return (
    <div
      className={classNames(
        styles.toolssubpanel,
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ToolSubPanel;
