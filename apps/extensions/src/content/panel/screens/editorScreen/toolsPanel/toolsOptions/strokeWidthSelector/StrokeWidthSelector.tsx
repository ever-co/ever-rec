import AppSvg from '@/content/components/elements/AppSvg';
import { Select } from 'antd';
import classNames from 'classnames';
import React from 'react';

import './stroke-width-selector.css';

interface IStrokeWidthSelectorProps {
  width: number;
  onChange: (width: number) => void;
  className?: string;
  tool?: string;
}

const StrokeWidthSelector: React.FC<IStrokeWidthSelectorProps> = ({
  width,
  onChange,
  className,
  tool,
}) => {
  const pencilwidths: number[] = [2, 4, 6, 8, 16];
  const rollerwidths: number[] = [6, 8, 16, 32, 48];
  return (
    <div className={classNames(className)}>
      <Select
        value={width}
        onChange={onChange}
        className="tw-w-24 tw-rounded stroke-selector"
        suffixIcon={
          <AppSvg
            path="images/panel/common/widthselector.svg"
            className="tw-text-black "
          />
        }
      >
        {tool === 'roller'
          ? rollerwidths.map((w) => (
              <Select.Option key={w} value={w}>
                <div className="tw-flex tw-text-black tw-flex-col tw-items-center app-selectable title">
                  <div className="tw-text-xs app-selectable">{w} px</div>
                  <div
                    style={{ height: `${w > 8 ? w / 3 : w / 2}px` }}
                    className="tw-bg-black tw-w-full tw-rounded-full app-selectable bottom-line"
                  ></div>
                </div>
              </Select.Option>
            ))
          : pencilwidths.map((w) => (
              <Select.Option key={w} value={w}>
                <div className="tw-flex tw-text-black tw-flex-col tw-items-center app-selectable title">
                  <div className="tw-text-xs app-selectable">{w} px</div>
                  <div
                    style={{ height: `${w}px` }}
                    className="tw-bg-black tw-w-full tw-rounded-full app-selectable bottom-line"
                  ></div>
                </div>
              </Select.Option>
            ))}
      </Select>
    </div>
  );
};

export default StrokeWidthSelector;
