import classNames from 'classnames';
import React from 'react';

interface IToolsRowProps {
  className?: string;
  children?: React.ReactNode;
}

const ToolsRow: React.FC<IToolsRowProps> = ({ className, children }) => {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-around' }}
      className={classNames(className)}
    >
      {children}
    </div>
  );
};

export default ToolsRow;
