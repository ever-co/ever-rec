import AppSvg from 'components/elements/AppSvg';
import React, { CSSProperties } from 'react';
import classNames from 'classnames';

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
        'tw-col-span-2 tw-flex tw-items-center tw-px-3 tw-h-10 tw-mb-1 tw-cursor-pointer tw-rounded-md',
      )}
      onClick={onClick}
    >
      <div
        className="tw-me-3 tw-flex tw-items-center"
        onClick={() => toggleExpand && toggleExpand()}
      >
        {showArrow &&
          (isExpanded ? (
            <AppSvg
              path="/common/arrow-down.svg"
              size="9px"
              className="tw-me-3 [&_path]:tw-fill-current"
            />
          ) : (
            <AppSvg
              path="/common/arrow-left.svg"
              size="9px"
              className="tw-me-3 [&_path]:tw-fill-current rtl:-tw-scale-x-100"
            />
          ))}
        <AppSvg path="/common/folder-v2.svg" bgColor={color} size="20px" />
      </div>
      <div className="tw-text-sm tw-font-medium tw-w-full tw-truncate">
        {title}
      </div>
    </div>
  );
};

export default SidebarFolderItem;
