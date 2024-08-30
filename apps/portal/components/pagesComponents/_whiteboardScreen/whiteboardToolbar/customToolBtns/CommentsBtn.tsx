import React from 'react';
import ToolButton from '../ToolButton';
import { tools, ITool } from '../whiteboard_tools';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';

interface ICommentToolProps {
  isOpenEditTool: boolean;
  options: ICommentsOptions;
  active: boolean;
  onToolChange: (tool: ITool) => void;
  onResetShape: () => void;
}

const CommentBtn = (props: ICommentToolProps) => {
  return (
    <ToolButton
      toolTitle={tools.comments.title}
      isOpenEditTool={props.isOpenEditTool}
      active={props.active}
      icon={tools.comments.icon}
      onSelect={() => {
        props.onResetShape();
        props.onToolChange(tools.comments);
      }}
    >
      <div
        onClick={() => {
          props.onResetShape();
        }}
      ></div>
    </ToolButton>
  );
};

export default CommentBtn;
