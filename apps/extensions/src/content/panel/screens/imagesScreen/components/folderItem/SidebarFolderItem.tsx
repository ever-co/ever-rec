import AppSvg from '@/content/components/elements/AppSvg';
import classNames from 'classnames';
import React, { CSSProperties } from 'react';

interface ISidebarFolderItemProps {
  title: string;
  className?: string;
  onClick: () => void;
  showArrow?: boolean;
  isExpanded?: boolean;
  toggleExpand?: () => void;
  style?: CSSProperties;
  color: string;
}

const SidebarFolderItem: React.FC<ISidebarFolderItemProps> = ({
  title,
  className,
  onClick,
  showArrow,
  isExpanded,
  toggleExpand,
  style,
  color,
}) => {
  return (
    <div
      style={style}
      className={classNames(
        className,
        'tw-col-span-2 tw-flex tw-items-center tw-px-3 tw-h-12 tw-mb-3 tw-cursor-pointer tw-rounded-xl',
      )}
      onClick={onClick}
    >
      <div
        className="tw-mr-4 tw-flex tw-items-center"
        onClick={() => toggleExpand && toggleExpand()}
      >
        {showArrow &&
          (isExpanded ? (
            <AppSvg
              path="images/panel/common/arrow-down.svg"
              size="9px"
              className="tw-mr-3"
            />
          ) : (
            <AppSvg
              path="images/panel/common/arrow-left.svg"
              size="9px"
              className="tw-mr-3"
            />
          ))}
        <AppSvg
          path="images/panel/common/folder-v2.svg"
          bgColor={color}
          size="28px"
        />
      </div>
      <div className="tw-font-semibold mx-sm:tw-text-sm tw-w-full tw-truncate">
        {title}
      </div>
    </div>
  );
};

export default SidebarFolderItem;
