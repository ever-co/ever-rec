import classNames from 'classnames';
import React from 'react';
import zoomIn from 'public/assets/svg/tools-panel/ZoomIn.svg';
import zoomOut from 'public/assets/svg/tools-panel/ZoomOut.svg';
import Image from 'next/legacy/image';

interface IAppNumberSelectorProps {
  value: number;
  valuesArr?: number[];
  min?: number;
  max?: number;
  suffix?: string;
  step?: number;
  className?: string;
  light?: boolean;
  onChange: (value: number) => void;
}

const ScaleSelector: React.FC<IAppNumberSelectorProps> = ({
  value,
  valuesArr,
  min,
  max,
  suffix,
  step = 1,
  className,
  light,
  onChange,
}) => {
  const increase = () => {
    const res = value + step;
    if (max && res > max) {
      return;
    }
    onChange(res);
  };

  const decrease = () => {
    const res = value - step;
    if (min && res < min) {
      return;
    }
    onChange(res);
  };

  return (
    <div
      className={classNames(
        'tw-flex tw-items-center tw-justify-between tw-py-1 tw-px-3  tw-mx-1',
        className,
      )}
    >
      <div
        className="tw-cursor-pointer tw-flex tw-items-center tw-justify-center tw-text-black "
        onClick={decrease}
      >
        <Image src={zoomOut} width={24} height={24} alt={'minus'} />
      </div>
      <div className="tw-flex tw-items-center tw-justify-center tw-text-black ">
        <span className="tw-text-sm tw-select-none">{value}</span>
        {suffix && <div className="tw-select-none tw-text-xs">{suffix}</div>}
      </div>

      <div
        className="tw-cursor-pointer tw-flex tw-items-center tw-justify-center tw-text-black "
        onClick={increase}
      >
        <Image src={zoomIn} width={24} height={24} alt={'plus'} />
      </div>
    </div>
  );
};

export default ScaleSelector;
