import classNames from 'classnames';
import React from 'react';

export interface IAppTagProps {
  text: string;
  bgColor?: string;
  classsName?: string;
}

const AppTag: React.FC<IAppTagProps> = ({
  text,
  classsName,
  bgColor = 'tw-bg-green',
}) => {
  return (
    <div
      className={classNames(
        classsName,
        bgColor,
        'tw-px-5 tw-font-semibold tw-text-sm tw-h-6 tw-flex tw-w-max tw-items-center tw-rounded-5',
      )}
    >
      <div>{text}</div>
    </div>
  );
};

export default AppTag;
