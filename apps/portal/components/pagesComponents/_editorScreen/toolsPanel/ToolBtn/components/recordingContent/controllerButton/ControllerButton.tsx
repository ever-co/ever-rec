import Image from 'next/legacy/image';
import React from 'react';

interface IControllerButtonProps {
  className: string;
  imgSource: string;
  subFoldersWithPrefix?: string;
  onClick: () => void;
  onMouse?: () => void;
  outMouse?: () => void;
  disabled?: boolean;
}

const ControllerButton: React.FC<IControllerButtonProps> = ({
  className,
  imgSource,
  subFoldersWithPrefix = '',
  onClick,
  onMouse,
  outMouse,
  disabled,
}) => {
  const clickHandler = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  const onMouseHandler = () => {
    if (onMouse) {
      onMouse();
    }
  };
  const outMouseHandler = () => {
    if (outMouse) {
      outMouse();
    }
  };

  return (
    <div
      className={className ? className : ''}
      onClick={clickHandler}
      onMouseOver={onMouseHandler}
      onMouseLeave={outMouseHandler}
    >
      <Image
        src={`/contentImages/${imgSource}`}
        alt=""
        width={imgSource == 'button-stop-red-fill.svg' ? 74 : 34}
        height={imgSource == 'button-stop-red-fill.svg' ? 34 : 32}
      />
    </div>
  );
};

export default ControllerButton;
