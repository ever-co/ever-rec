import classNames from 'classnames';
import { ReactElement } from 'react';


interface ICaptureTabBtn {
  active: boolean;
  icon: ReactElement;
  title: string;
  borderTopLeft?: boolean;
  borderTopRight?: boolean;
  tabClicked: () => void;
}

const CaptureTabBtn: React.FC<ICaptureTabBtn> = ({
  active = false,
  icon,
  title,
  borderTopLeft = false,
  borderTopRight = false,
  tabClicked,
}) => {
  return (
    <div
      className={classNames(
        'tw-flex tw-flex-1 tw-justify-center tw-items-center tw-cursor-pointer tw-select-none',
        borderTopLeft && 'tw-rounded-tl-lg',
        borderTopRight && 'tw-rounded-tr-lg',
        active && 'tw-text-primary-purple tw-bg-white dark:tw-bg-section-black',
        !active && 'hover:tw-bg-dark-grey   dark:hover:tw-bg-section-black',
      )}
      onClick={tabClicked}
    >
      {icon}
      <span className="tw-font-semibold tw-ml-2 dark:tw-text-white">
        {title}
      </span>
    </div>
  );
};

export default CaptureTabBtn;
