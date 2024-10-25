import { useCallback, useEffect, useRef, useState } from 'react';
import './colorSelector.scss';
import classNames from 'classnames';
import AppSvg from '@/content/components/elements/AppSvg';
import { SketchPicker } from 'react-color';
import useClickOrKeyOutside from '@/content/utilities/hooks/useClickOrKeyOutside';

const SketchPickerReact = SketchPicker as any;

interface IColorSelectorProps {
  color: string;
  icon?: string;
  className?: string;
  colorIndicator?: boolean;
  onChange: (color: string) => void;
}

const ColorSelector: React.FC<IColorSelectorProps> = ({
  children,
  color,
  icon,
  className,
  colorIndicator,
  onChange,
}) => {
  const ref = useRef(null);
  const [active, setActive] = useState<boolean>(false);
  const [localColor, setLocalColor] = useState<string>(color);
  const [sketchStyles, setSketchStyles] = useState({});

  useClickOrKeyOutside(ref, () => setActive(false));

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  const getRGBA = (color: any) => {
    const { r, g, b, a } = color.rgb;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const onChangeHandler = (newColor: any) => {
    setLocalColor(getRGBA(newColor));
  };

  const onChangeCompleteHandler = (newColor: any) => {
    onChange(getRGBA(newColor));
  };

  const togglePicker = () => {
    setActive(!active);
  };

  const colorContainerRef = useCallback((node) => {
    if (!node) return;
    const rectangle = node.getBoundingClientRect();

    if (rectangle.top < 0) {
      setSketchStyles({ bottom: rectangle.top - 10 });
    }

    // here can be added condition to check if the color picker is below the view port, if needed. It should be trivial.
  }, []);

  return (
    <div
      ref={ref}
      className={classNames(
        'tw-relative tw-flex tw-items-center tw-mr-0 tw-ml-2',
        className,
      )}
    >
      {children && (
        <div style={{ cursor: 'pointer' }} onClick={togglePicker}>
          {children}
        </div>
      )}

      {icon ? (
        <div style={{ cursor: 'pointer' }} onClick={togglePicker}>
          <div className="tw-flex tw-items-center tw-justify-center">
            <img className="color-picker" src={icon} />
          </div>

          {colorIndicator ? (
            <div
              className="tw-w-6 tw-h-2 color-picker"
              style={{
                backgroundColor: localColor,
                border: '1px solid #D8D8D8',
              }}
            ></div>
          ) : (
            <div></div>
          )}
        </div>
      ) : (
        <div
          className="tw-w-6 tw-h-6 tw-border tw-border-solid tw-rounded color-picker"
          style={{
            backgroundColor: localColor,
            border: '1px solid black',
            cursor: 'pointer',
          }}
          onClick={togglePicker}
        ></div>
      )}

      {!icon && (
        <div
          className="tw-mr-1 tw-text-sm"
          style={{ cursor: 'pointer' }}
          onClick={togglePicker}
        >
          <AppSvg
            path="images/panel/common/widthselector.svg"
            className="tw-m-5px color-picker"
            size="8px"
          />
        </div>
      )}

      <div className="tw-absolute tw-left-0 tw-z-50">
        {active && (
          <div
            className="sketchPickerContainer"
            style={sketchStyles}
            ref={colorContainerRef}
          >
            <SketchPickerReact
              className="sketch-picker"
              color={localColor}
              onChange={onChangeHandler}
              onChangeComplete={onChangeCompleteHandler}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorSelector;
