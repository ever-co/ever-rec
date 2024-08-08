import React, { CSSProperties } from 'react';

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
  let disabledStyles: CSSProperties = {};
  if (disabled) {
    disabledStyles = {
      opacity: '0.70',
      cursor: 'default',
    };
  }

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
      className={className}
      style={disabledStyles}
      onClick={clickHandler}
      onMouseOver={onMouseHandler}
      onMouseLeave={outMouseHandler}
    >
      <img
        src={chrome.runtime.getURL(
          `./images/contentImages${subFoldersWithPrefix}/${imgSource}`,
        )}
        alt=""
      />
    </div>
  );
};

export default ControllerButton;
