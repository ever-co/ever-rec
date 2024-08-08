import React from 'react';
import { EllipsisOutlined } from '@ant-design/icons';
import { Dropdown, Button } from 'antd';

interface IContextMenuProps {
  menu: JSX.Element;
}
const ContextMenu = ({ menu }: IContextMenuProps) => {
  return (
    <div>
      <Dropdown placement="bottomRight" overlay={menu} trigger={['click']}>
        <Button
          size="small"
          shape="circle"
          icon={<EllipsisOutlined rev={undefined} />}
        />
      </Dropdown>
    </div>
  );
};

export default ContextMenu;
