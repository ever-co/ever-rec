import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './colorSelector.module.scss';
import classNames from 'classnames';
import Image from 'next/legacy/image';
import { SketchPicker } from 'react-color';
import widthselector from 'public/common/widthselector.svg';
import useClickOrKeyOutside from 'hooks/useClickOrKeyOutside';

interface IColorSelectorProps {
  children?: any;
  color: string;
  icon?: string;
  className?: string;
  forPencilTool?: boolean;
  colorIndicator?: boolean;
  onChange: (color: string) => void;
}

const ColorSelector: React.FC<IColorSelectorProps> = ({
  children,
  color,
  icon,
  className,
  forPencilTool,
  colorIndicator,
  onChange,
}) => {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const [localColor, setLocalColor] = useState(color);
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
    <div ref={ref} className={classNames(styles.mainContainer, className)}>
      {children && (
        <div style={{ cursor: 'pointer' }} onClick={togglePicker}>
          {children}
        </div>
      )}

      {icon ? (
        <div style={{ cursor: 'pointer' }} onClick={togglePicker}>
          <div className={styles.flexContainer}>
            <Image src={icon} alt="" />
          </div>

          {colorIndicator ? (
            <div
              style={{
                backgroundColor: localColor,
                border: '1px solid #D8D8D8',
                width: '1.5rem',
                height: '0.5rem',
              }}
            ></div>
          ) : (
            <div></div>
          )}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: localColor,
            border: '1px solid black',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '0.25rem',
            cursor: 'pointer',
          }}
          onClick={togglePicker}
        />
      )}

      {!icon && (
        <div className={styles.imgWrapper} onClick={togglePicker}>
          <Image src={widthselector} width={8} height={6} alt="" />
        </div>
      )}

      <div className={styles.container}>
        {active && (
          <div
            ref={colorContainerRef}
            style={sketchStyles}
            className={classNames(styles.sketchpickerContainer)}
          >
            <SketchPicker
              className={classNames(styles.sketchpicker)}
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
