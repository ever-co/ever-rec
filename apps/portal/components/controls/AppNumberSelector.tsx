import classNames from 'classnames';
import React from 'react';
import zoomIn from 'public/assets/svg/tools-panel/ZoomIn.svg';
import zoomOut from 'public/assets/svg/tools-panel/ZoomOut.svg';
import Image from 'next/image';

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

const AppNumberSelector: React.FC<IAppNumberSelectorProps> = ({
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
  // const increase = useCallback(() => {
  //   const res = value + step;
  //   if (max && res > max) {
  //     return;
  //   }
  //   onChange(res);
  // }, [value]);

  // const decrease = useCallback(() => {
  //   const res = value - step;
  //   if (min && res < min) {
  //     return;
  //   }
  //   onChange(res);
  // }, [value]);

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
    <>
      {!valuesArr ? (
        <div className={classNames('tw-flex tw-items-center ', className)}>
          <div
            className="tw-cursor-pointer tw-flex tw-items-center tw-justify-center tw-text-black "
            onClick={increase}
          >
            <Image src={zoomIn} width={20} height={20} alt={'plus'} />
          </div>

          <div className="tw-flex tw-items-center  tw-justify-center tw-text-black ">
            <span className="tw-text-xs tw-select-none">{value}</span>
            {suffix && (
              <div className="tw-select-none tw-text-xs">{suffix}</div>
            )}
          </div>

          <div
            className="tw-cursor-pointer tw-flex tw-items-center tw-justify-center tw-text-black "
            onClick={decrease}
          >
            <Image src={zoomOut} width={20} height={20} alt={'plus'} />
          </div>
        </div>
      ) : (
        <div
          className={classNames(
            'tw-flex tw-items-center tw-justify-between tw-py-1 tw-px-3  tw-w-86px tw-mx-1',
            className,
          )}
        >
          <div
            className="tw-cursor-pointer tw-flex tw-items-center tw-justify-center tw-text-black "
            onClick={increase}
          >
            <Image src={zoomIn} width={20} height={20} alt={'plus'} />
          </div>

          <div className="tw-flex tw-items-center tw-justify-center tw-text-black ">
            <span className="tw-text-sm tw-select-none">{value}</span>
            {suffix && (
              <div className="tw-select-none tw-text-xs">{suffix}</div>
            )}
          </div>

          <div
            className="tw-cursor-pointer tw-flex tw-items-center tw-justify-center tw-text-black "
            onClick={decrease}
          >
            <Image src={zoomOut} width={20} height={20} alt={'minus'} />
          </div>
        </div>
      )}
    </>
  );
};

export default AppNumberSelector;
