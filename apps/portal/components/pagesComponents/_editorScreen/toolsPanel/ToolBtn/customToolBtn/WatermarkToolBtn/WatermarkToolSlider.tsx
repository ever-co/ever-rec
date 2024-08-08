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
    <div style={{marginTop: '1rem'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', lineHeight: '1.25rem'}}>
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
