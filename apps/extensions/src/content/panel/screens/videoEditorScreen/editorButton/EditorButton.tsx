import classNames from 'classnames';
import React from 'react';


interface IEditorButton {
  title: string;
  color: string;
  onClick: () => void;
  textcolor: string;
  disabled?: boolean;
  lowerOpacity?: boolean;
}
const EditorButton: React.FC<IEditorButton> = ({
  title,
  color,
  onClick,
  textcolor,
  disabled = false,
  lowerOpacity = false,
}) => {
  const clickHandler = () => {
    if (disabled) return;

    onClick();
  };

  return (
    <div className="">
      <button
        className={classNames(
          `${color} ${textcolor} tw-py-3 tw-px-5 tw-rounded-md tw-text-center tw-text-sm tw-font-bold`,
          disabled && 'tw-cursor-not-allowed',
          disabled && lowerOpacity && 'tw-bg-opacity-80',
        )}
        onClick={clickHandler}
      >
        {title}
      </button>
    </div>
  );
};

export default EditorButton;
