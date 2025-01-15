/* eslint-disable @next/next/no-img-element */
import { MouseEventHandler, FC } from 'react';
import Image from 'next/legacy/image';

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
          className={className}
          objectFit="contain"
        />
      ) : (
        <img src="/logo/logo_black.svg" alt="logo" className={className} />
      )}
    </div>
  );
};

export default Logo;
