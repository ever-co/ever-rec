import { useCallback } from 'react';
import { IMenuItem } from './Header';
import { Tooltip } from 'antd';

interface IMainMenuItemProps {
  item: IMenuItem;
  title?: string;
  showTitle?: boolean;
  onItemSelect: Function;
}

const MenuItem: React.FC<IMainMenuItemProps> = ({
  item,
  title,
  showTitle = false,
  onItemSelect,
}) => {
  const handleClick = useCallback(() => {
    onItemSelect(item);
  }, [item]);

  return (
    <div className="tw-flex tw-ml-4 tw-cursor-pointer" onClick={handleClick}>
      <Tooltip
        className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-cursor-pointer"
        placement={'bottomLeft'}
        title={title}
      >
        {item.icon}
        {showTitle && (
          <span className="tw-ml-2 tw-text-sm tw-font-semibold">{title}</span>
        )}
      </Tooltip>
    </div>
  );
};

export default MenuItem;
