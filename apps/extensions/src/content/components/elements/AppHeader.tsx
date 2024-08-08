import classNames from 'classnames';
import React from 'react';


export interface IAppHeaderProps {
  part1: string;
  part2: string;
  className?: string;
  spacing?:boolean;
  textSize?: 'xl'|'2xl'|'4xl'|'5xl';
}

const AppHeader: React.FC<IAppHeaderProps> = (({ part1, part2, spacing = true, className, textSize = '4xl'}) => {
  
  return (
    <h1 className={classNames('tw-font-roboto tw-font-bold', className, `tw-text-${textSize}`)}>
      <span
      className={classNames("tw-text-dark-blue", { 'tw-mr-2': spacing })}
      >{part1}</span>
      <span>{part2}</span>
    </h1>
  );
});

export default AppHeader;
