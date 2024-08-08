import classNames from 'classnames';
import React from 'react';

interface IToolsColProps {
  className?: string;
  children: any;
}

const ToolsColumn: React.FC<IToolsColProps> = ({ className, children }) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
};

export default ToolsColumn;
