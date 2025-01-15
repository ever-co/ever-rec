import React from 'react';
import { Slider } from 'antd';

interface IWatermarkToolSliderProps {
  value: number;
  title: string;
  min?: number;
  max?: number;
  onChange: (options: number) => void;
}

const WatermarkToolSlider: React.FC<IWatermarkToolSliderProps> = ({
  value,
  title,
  min = 0,
  max = 100,
  onChange,
}) => {
  return (
    <div className="tw-mt-4">
      <div className="tw-flex tw-justify-between tw-text-sm">
        <div>{title}</div>
        <div>
          {value} {title === 'Angle' ? '°' : '%'}{' '}
        </div>
      </div>
      <Slider value={value} onChange={onChange} min={min} max={max} />
    </div>
  );
};

export default WatermarkToolSlider;
