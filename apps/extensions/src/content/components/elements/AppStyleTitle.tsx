import classNames from 'classnames';
import React from 'react';


export interface AppStyleTitleProps {
  title1: string;
  title2: string;
  spacing?:boolean;
}

const AppStyleTitle: React.FC<AppStyleTitleProps> = (({ title1, title2, spacing }) => {
  
  return (
    <>
      <span
      className={classNames("tw-text-primary", { 'tw-mr-1': spacing })}
      >{title1}</span>
      <span className="tw-text-primary-lighter">{title2}</span>
    </>
  );
});

export default AppStyleTitle;
