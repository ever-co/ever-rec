import React from 'react';
import 'clipboard-polyfill/overwrite-globals';
import classNames from 'classnames';
//@ts-ignore
import * as styles from './AppContainer.module.scss';

interface IAppContainerProps {
  className?: string;
  isHeader?: boolean;
}

const AppContainer: React.FC<IAppContainerProps> = ({
  children,
  isHeader,
  className,
}) => {
  return (
    <div>
      <div
        className={classNames(
          'tw-w-full default:tw-px-2 sm:tw-px-2 md:tw-px-24 lg:tw-px-2 xl:tw-px-12 2xl:tw-px-32',
          className,
          isHeader && styles.wrapper,
        )}
      >
        {children}
      </div>
      <div></div>
    </div>
  );
};

export default AppContainer;
