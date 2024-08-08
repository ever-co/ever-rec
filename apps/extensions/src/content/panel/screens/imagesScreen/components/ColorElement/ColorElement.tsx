import classNames from 'classnames';

interface IColorElement {
  color: string;
  colorId: string;
  bgColor: string;
  handleColor: (id: string) => void;
  circleSize?: number;
}

const ColorElement = ({
  color,
  colorId,
  bgColor,
  handleColor,
  circleSize,
}: IColorElement) => {
  return (
    <div
      id={colorId}
      className={classNames(
        'tw-mx-2 tw-rounded-full tw-cursor-pointer',
        !circleSize && color == colorId
          ? 'tw-w-24px tw-h-24px'
          : 'tw-h-20px tw-w-20px',
        bgColor,
      )}
      style={{ width: `${circleSize}px`, height: `${circleSize}px` }}
      onClick={(e) => {
        e.stopPropagation();
        handleColor(e.currentTarget.id);
      }}
    ></div>
  );
};

export default ColorElement;
