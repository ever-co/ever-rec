import React, { FC } from 'react';
import { Avatar, Tooltip } from 'antd';

type IProps = any;

const WhiteboardCardTeamGroup: FC<IProps> = ({ team }) => {
  return (
    <Avatar.Group size={26}>
      {team.map((teammate, index) => {
        return (
          <Tooltip key={index} title={teammate.name} placement="top">
            <Avatar
              style={{ backgroundColor: `${teammate.color}` }}
              // icon={<UserOutlined />}
            >
              {teammate.name}
            </Avatar>
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
};

export default WhiteboardCardTeamGroup;
