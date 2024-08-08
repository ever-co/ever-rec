import { FC, MouseEvent, ReactNode } from 'react';
import classNames from 'classnames';
import styles from './AppButton2.module.scss';

interface AppInputProps {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  width?: number;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (e: MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLButtonElement>) => void;
}

const AppButton2: FC<AppInputProps> = ({
  children,
  disabled,
  className,
  width,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const clickHandler = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;

    onClick(e);
  };

  return (
    <button
      style={width ? { width } : undefined}
      className={classNames(styles.appButton2, className)}
      onClick={clickHandler}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </button>
  );
};

export default AppButton2;
