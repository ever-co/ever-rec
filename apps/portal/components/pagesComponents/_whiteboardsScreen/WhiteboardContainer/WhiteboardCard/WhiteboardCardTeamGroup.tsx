import React, { FC } from 'react';
import { Avatar, Tooltip } from 'antd';

type IProps = any;

const WhiteboardCardTeamGroup: FC<IProps> = ({ team }) => {
  return (
    <Avatar.Group size={24}>
      {team.map((teammate, index) => {
        return (
          <Tooltip key={index} title={teammate.name} placement="top">
            <Avatar
              // The ground is the teammate's own colour (data): the initial on it stays dark in
              // both themes, and the ring between avatars takes the preview's ground.
              style={{
                backgroundColor: `${teammate.color}`,
                borderColor: 'hsl(var(--muted))',
                color: 'hsl(var(--overlay))',
              }}
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
