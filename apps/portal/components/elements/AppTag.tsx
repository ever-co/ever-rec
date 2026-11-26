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
  bgColor = 'tw-bg-[hsl(var(--success-muted))] tw-text-success',
}) => {
  return (
    <div
      className={classNames(
        classsName,
        bgColor,
        'tw-px-2 tw-font-medium tw-text-xs tw-h-6 tw-flex tw-w-max tw-items-center tw-rounded-md',
      )}
    >
      <div>{text}</div>
    </div>
  );
};

export default AppTag;
