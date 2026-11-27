/* eslint-disable @next/next/no-img-element */
import { MouseEventHandler, FC } from 'react';
import Image from 'next/legacy/image';
import classNames from 'classnames';

// The wordmark file is black ink: inverted in the dark theme, where it would not show.
const DARK_THEME_INK = 'dark:tw-invert';

interface ILogoProps {
  type?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  width?: number;
  height?: number;
}

const Logo: FC<ILogoProps> = ({ type, className, onClick, width, height }) => {
  return (
    <div onClick={onClick} className="tw-cursor-pointer">
      {width && height ? (
        <Image
          src="/logo/logo_black.svg"
          alt="logo"
          width={width}
          height={height}
          className={classNames(className, DARK_THEME_INK)}
          objectFit="contain"
        />
      ) : (
        <img
          src="/logo/logo_black.svg"
          alt="logo"
          className={classNames(className, DARK_THEME_INK)}
        />
      )}
    </div>
  );
};

export default Logo;
