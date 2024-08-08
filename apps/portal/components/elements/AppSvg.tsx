import { FC, CSSProperties } from 'react';
import { ReactSVG } from 'react-svg';

interface IAppSvgProps {
  id?: string;
  path: string;
  size?: string;
  width?: string;
  height?: string;
  className?: string;
  bgColor?: string;
  color?: string;
  style?: CSSProperties;
}

const AppSvg: FC<IAppSvgProps> = ({
  id,
  path,
  className,
  size,
  width,
  height,
  bgColor,
  color,
  style,
}) => {
  const setSize = (svg: SVGSVGElement, size?: string) => {
    if (size) {
      svg.setAttribute(
        'style',
        `width: ${size}; height: ${size};
        ${bgColor ? 'fill:' + bgColor + ';' : ''}`,
      );
      return;
    }

    if (width && height) {
      svg.setAttribute(
        'style',
        `width: ${width}; height: ${height};
        ${bgColor ? 'fill:' + bgColor + ';' : ''}`,
      );
    }
  };

  const setColor = (svg: SVGSVGElement, color?: string) => {
    color && svg.setAttribute('color', color);
  };

  return (
    <ReactSVG
      id={id}
      src={`${path}`}
      style={style ?? undefined}
      className={className}
      beforeInjection={(svg) => {
        setSize(svg, size);
        setColor(svg, color);
      }}
    />
  );
};

export default AppSvg;
