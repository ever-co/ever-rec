import classNames from 'classnames';
import React from 'react';

interface IToolsRowProps {
  className?: string;
}

const ToolsRow: React.FC<IToolsRowProps> = ({ className, children }) => {
  return (
    <div className={classNames('tw-flex tw-justify-around  ', className)}>
      {children}
    </div>
  );
};

export default ToolsRow;
