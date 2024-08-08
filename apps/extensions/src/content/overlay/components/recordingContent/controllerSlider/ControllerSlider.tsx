import React, { ChangeEvent } from 'react';
import '@/content/content';

interface IControllerSliderProps {
  imageUrl: string;
  inputValue: number;
  penSliderRef: any;
  onMouseHandler: () => void;
  outMouseHandler: () => void;
  onChangeSlider: (event: ChangeEvent) => void;
}

const ControllerSlider: React.FC<IControllerSliderProps> = ({
  imageUrl,
  inputValue,
  penSliderRef,
  onMouseHandler,
  outMouseHandler,
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
    >
      <input
        onChange={inputHandler}
        type="range"
        min="5"
        max="30"
        value={inputValue}
      />
      <img
        src={chrome.runtime.getURL(`./images/contentImages/${imageUrl}`)}
        alt=""
      />
    </div>
  );
};

export default ControllerSlider;
