import { MouseEvent, ReactNode } from 'react';
import styles from './AppButtonSecond.module.scss';
import classNames from 'classnames';

interface AppInputProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: (e: any) => void;
}

const AppButtonSecond: React.FC<AppInputProps> = ({
  children,
  className,
  disabled = false,
  danger = false,
  onClick,
}) => {
  const clickHandler = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();

    !disabled && onClick(e);
  };

  return (
    <button
      className={classNames(
        styles.appButtonSecond,
        danger && styles.appButtonDanger,
        disabled && styles.appButtonDisabled,
        className,
      )}
      onClick={clickHandler}
    >
      {children}
    </button>
  );
};

export default AppButtonSecond;
