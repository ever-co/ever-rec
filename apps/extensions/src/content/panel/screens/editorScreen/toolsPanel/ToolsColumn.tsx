import classNames from 'classnames';
import React from 'react';


interface IToolsColProps {
  className?: string;
}

const ToolsColumn: React.FC<IToolsColProps> = ({ className, children }) => {
  return (
    <div
      className={classNames(
        'tw-flex tw-justify-around tw-items-center tw-flex-col   ',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default ToolsColumn;
