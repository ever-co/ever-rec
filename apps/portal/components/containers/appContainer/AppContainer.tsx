import React from 'react';
import classNames from 'classnames';
import styles from "./AppContainer.module.scss"

interface IAppContainerProps {
  className?: string;
  children: React.ReactNode;
  isHeader?: boolean;
  style?: React.CSSProperties;
}

const AppContainer: React.FC<IAppContainerProps> = ({
  children,
  className,
  isHeader,
  style,
}) => {
  return (
    <div>
      <div
        className={classNames(
          'tw-w-full default:tw-px-2 sm:tw-px-2 md:tw-px-2 lg:tw-px-2 xl:tw-px-12 2xl:tw-px-32',
          className,
          isHeader && styles.wrapper
        )}
        style={style || {}}
      >
        {children}
      </div>
      <div></div>
    </div>
  );
};

export default AppContainer;
