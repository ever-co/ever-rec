import { FC, CSSProperties } from 'react';
import { ReactSVG } from 'react-svg';
import classNames from 'classnames';

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
  /**
   * Whether the ink of the drawing follows the text colour (so it works on light and dark).
   * Defaults to yes for icon-sized drawings (up to 40px) and no for pictures.
   */
  themed?: boolean;
}

const ICON_MAX_PX = 40;

const toPx = (value?: string): number | null => {
  if (!value) return null;
  const match = /^(\d+(?:\.\d+)?)(px)?$/.exec(value.trim());
  return match ? Number(match[1]) : null;
};

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
  themed,
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

  const largestSide = Math.max(
    toPx(size) ?? 0,
    toPx(width) ?? 0,
    toPx(height) ?? 0,
  );
  // A real `bgColor` is the caller choosing the fill; several callers pass a Tailwind class name
  // there, which never was a colour and paints nothing.
  const hasOwnFill = !!bgColor && !bgColor.startsWith('tw-');
  const isIcon =
    themed ?? (largestSide > 0 && largestSide <= ICON_MAX_PX && !hasOwnFill);

  return (
    <ReactSVG
      id={id}
      src={`${path}`}
      style={style ?? undefined}
      // `app-svg-icon`: styles/base.scss repaints the black ink with `currentColor`.
      className={classNames(className, isIcon && 'app-svg-icon')}
      beforeInjection={(svg) => {
        setSize(svg, size);
        setColor(svg, color);
      }}
    />
  );
};

export default AppSvg;
