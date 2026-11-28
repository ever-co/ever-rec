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
          // The caller chooses the ground and the text colour (token classes such as
          // `tw-bg-primary` + `tw-text-primary-foreground`); the shape is the shared button's.
          `${color} ${textcolor} tw-h-9 tw-px-4 tw-rounded-md tw-text-center tw-text-sm tw-font-medium`,
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
