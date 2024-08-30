import AppSvg from 'components/elements/AppSvg';
import { Select } from 'antd';
import classNames from 'classnames';
import React from 'react';

import styles from './strokeWidthSelector.module.scss';

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
        className={classNames('stroke-selector', styles.mainSelector)}
        suffixIcon={
          <AppSvg path="/common/widthselector.svg" className={styles.black} />
        }
      >
        {tool === 'roller'
          ? rollerwidths.map((w) => (
              <Select.Option key={w} value={w}>
                <div
                  className={classNames(
                    'app-selectable',
                    'title',
                    styles.flexContainer,
                  )}
                >
                  <div className={classNames('app-selectable', styles.wrapper)}>
                    {w} px
                  </div>
                  <div
                    style={{ height: `${w > 8 ? w / 3 : w / 2}px` }}
                    className={classNames(
                      'app-selectable',
                      'bottom-line',
                      styles.select,
                    )}
                  ></div>
                </div>
              </Select.Option>
            ))
          : pencilwidths.map((w) => (
              <Select.Option key={w} value={w}>
                <div
                  className={classNames(
                    'app-selectable',
                    'title',
                    styles.flexContainer,
                  )}
                >
                  <div className={classNames('app-selectable', styles.wrapper)}>
                    {w} px
                  </div>
                  <div
                    style={{ height: `${w}px` }}
                    className={classNames(
                      'app-selectable',
                      'bottom-line',
                      styles.select,
                    )}
                  ></div>
                </div>
              </Select.Option>
            ))}
      </Select>
    </div>
  );
};

export default StrokeWidthSelector;
