import React, { ChangeEvent, FocusEvent } from 'react';
import '@/content/content';

interface IControllerSliderProps {
  imageUrl: string;
  inputValue: number;
  penSliderRef: any;
  /** Accessible name of the range input. */
  label: string;
  onMouseHandler: () => void;
  outMouseHandler: () => void;
  onFocusHandler?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlurHandler?: (event: FocusEvent<HTMLDivElement>) => void;
  onChangeSlider: (event: ChangeEvent) => void;
}

const ControllerSlider: React.FC<IControllerSliderProps> = ({
  imageUrl,
  inputValue,
  penSliderRef,
  label,
  onMouseHandler,
  outMouseHandler,
  onFocusHandler,
  onBlurHandler,
  onChangeSlider,
}) => {
  const inputHandler = (event: ChangeEvent) => {
    if (onChangeSlider) {
      onChangeSlider(event);
    }
  };

  return (
    <div
      ref={penSliderRef}
      className="penSlider"
      onMouseOver={onMouseHandler}
      onMouseLeave={outMouseHandler}
      onFocus={onFocusHandler}
      onBlur={onBlurHandler}
    >
      <input
        onChange={inputHandler}
        type="range"
        min="5"
        max="30"
        value={inputValue}
        aria-label={label}
      />
      <img
        src={chrome.runtime.getURL(`./images/contentImages/${imageUrl}`)}
        alt=""
      />
    </div>
  );
};

export default ControllerSlider;
