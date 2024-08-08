import { FC, MouseEventHandler } from 'react';
import { imagesPath } from '@/app/utilities/common';
import classNames from 'classnames';

interface ILogoProps {
  className?: string;
  type?: TypeLogo;
  onClick?: MouseEventHandler<HTMLImageElement>;
}

type TypeLogo = 'default' | 'yellow';

const Logo: FC<ILogoProps> = ({ className, type = 'default', onClick }) => {
  const logoTypes: Record<TypeLogo, string> = {
    default: 'logo_black.svg',
    yellow: 'logo_yellow.svg',
  };

  const logoSrc = `${imagesPath}logo/${logoTypes[type]}`;

  return (
    <img
      className={classNames(className, { 'tw-cursor-pointer': onClick })}
      src={logoSrc}
      onClick={onClick}
      alt="Logo"
    />
  );
};

export default Logo;
