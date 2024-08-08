import React from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { ICommentsOptions } from '../../../../../../../app/interfaces/tools_interfaces/ICommentsGroupOptions';

interface ICommentsToolProps {
  isOpenEditTool: boolean;
  options: ICommentsOptions;
  active: boolean;
  onChange: (options: ICommentsOptions) => void;
  onToolChange: (tool: ITool) => void;
  onResetShape: () => void;
  title?: string;
}
const CommentsTool: React.FC<ICommentsToolProps> = ({
  options,
  isOpenEditTool,
  active,
  onChange,
  onToolChange,
  onResetShape,
  title,
}) => {
  const optionsChangeHandler = (field: string, value: any) => {
    onChange({ ...options, [field]: value });
  };

  return (
    <ToolBtn
      toolTitle={tools.comments.title}
      isOpenEditTool={isOpenEditTool}
      active={active}
      placement="left"
      title={title}
      onSelect={() => {
        onResetShape();
        onToolChange(tools.comments);
        // infoMessage('We are working hard to add this feature!');
      }}
      icon={tools.comments.icon}
    >
      {/* <div className="tw-flex tw-items-center tw-justify-center">
   
      </div> */}
    </ToolBtn>
  );
};

export default CommentsTool;
