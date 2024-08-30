import React, { ReactElement } from 'react';
import { ICaptureFooterItem } from '../CaptureFooter';
import { Tooltip } from 'antd';

interface ICaptureFooterMenuItemProps {
  item: ICaptureFooterItem;
  icon: ReactElement;
  itemClicked: (item: ICaptureFooterItem) => void;
}

const CaptureFooterMenuItem: React.FC<ICaptureFooterMenuItemProps> = ({
  item,
  icon,
  itemClicked,
}) => {
  return (
    <div onClick={() => itemClicked(item)}>
      <Tooltip
        className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-cursor-pointer"
        placement={
          item.placement === 'top'
            ? 'top'
            : item.placement === 'topLeft'
              ? 'topLeft'
              : item.placement === 'topRight'
                ? 'topRight'
                : 'top'
        }
        title={item.description}
      >
        {icon}
        <span className="tw-mt-1 tw-text-xs tw-text-app-grey-darker">
          {item.title}
        </span>
      </Tooltip>
    </div>
  );
};

export default CaptureFooterMenuItem;
