import React, { useCallback, useState } from 'react';
import ToolButton from './ToolButton';
import { tools, ITool, compareWhiteboardTools } from './whiteboard_tools';
import TextToolBtn from './customToolBtns/TextToolBtn';
import { ITextOptions } from 'app/interfaces/tools_interfaces/ITextOptions';
import ConfirmModal from '../../_whiteboardsScreen/WhiteboardModals/ConfirmModal/ConfirmModal';
import SubPanelButton from './customToolBtns/SubPanelButton';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';
import CommentsBtn from './customToolBtns/CommentsBtn';

interface IToolBar {
  active_tool: ITool | null;
  setActiveTool: (active_tool: ITool | null) => void;
  textOptions: ITextOptions;
  onTextOptionsChange: (options: ITextOptions) => void;
  onResetShape: () => void;
  commentsOptions: ICommentsOptions;
  user;
  onWhiteboardDelete: () => void;
}

const ToolBar = (props: IToolBar) => {
  const [deleteModalVisibility, setDeleteModalVisibility] =
    useState<boolean>(false);

  const isActive = (tool: ITool): boolean =>
    compareWhiteboardTools(props.active_tool, tool);

  const activeShapeTool = useCallback((): ITool => {
    return (
      ([
        tools.rectangular,
        tools.circle,
        tools.star,
        tools.polygon,
        tools.image,
      ].some((tool) => compareWhiteboardTools(props.active_tool, tool))
        ? props.active_tool
        : tools.rectangular) || tools.rectangular
    );
  }, [props.active_tool]);

  return (
    <div
      className="tw-fixed tw-z-20"
      style={{
        top: '13%',
        left: '5px',
      }}
    >
      <div className="tw-bg-white !tw-border-iron-grey  tw-shadow-md tw-rounded-md tw-p-1px tw-flex tw-flex-col tw-items-center tw-border">
        {/*<ToolButton
          active={props.active_tool === tools.comments ? true : false}
          onSelect={() => {
            props.setActiveTool(tools.comments);
          }}
          toolTitle={tools.comments.title}
          iconSize={{ width: 16, height: 16 }}
          icon={tools.comments.icon}
        />*/}

        <CommentsBtn 
          isOpenEditTool={props.active_tool === tools.comments ? true : false}
          active={isActive(tools.comments)}
          onToolChange={props.setActiveTool}
          options={props.commentsOptions}
          onResetShape={props.onResetShape}
        />
        <hr className="tw-w-30px tw-border-iron-grey tw-my-1" />
        <TextToolBtn
          active={isActive(tools.text)}
          isOpenEditTool={props.active_tool === tools.text ? true : false}
          options={props.textOptions}
          onChange={props.onTextOptionsChange}
          setActiveTool={props.setActiveTool}
          onResetShape={props.onResetShape}
          title="text"
        />
        <ToolButton
          onSelect={() => {
            props.onResetShape();
            props.setActiveTool(activeShapeTool());
          }}
          toolTitle={activeShapeTool().title}
          isOpenEditTool={
            props.active_tool === tools.rectangular ? true : false
          }
          icon={activeShapeTool().icon}
          active={isActive(activeShapeTool())}
        >
          <div className="tw-flex tw-flex-col">
            <SubPanelButton
              onSelect={() => props.setActiveTool(tools.rectangular)}
              icon={tools.rectangular.icon}
              active={props.active_tool === tools.rectangular ? true : false}
              title={tools.rectangular.title}
              shortcut={'R'}
            />
            <SubPanelButton
              onSelect={() => props.setActiveTool(tools.circle)}
              icon={tools.circle.icon}
              active={props.active_tool === tools.circle ? true : false}
              title={tools.circle.title}
              shortcut={'O'}
            />
            <SubPanelButton
              onSelect={() => props.setActiveTool(tools.polygon)}
              icon={tools.polygon.icon}
              active={props.active_tool === tools.polygon ? true : false}
              iconHeight={18}
              title={tools.polygon.title}
            />
            <SubPanelButton
              onSelect={() => props.setActiveTool(tools.star)}
              icon={tools.star.icon}
              active={props.active_tool === tools.star ? true : false}
              iconHeight={19}
              title={tools.star.title}
            />
            <SubPanelButton
              onSelect={() => props.setActiveTool(tools.image)}
              icon={tools.image.icon}
              active={props.active_tool === tools.image ? true : false}
              title={tools.image.title}
              shortcut="⇧⌘K"
            />
          </div>
        </ToolButton>
        <ToolButton
          active={props.active_tool === tools.drawer ? true : false}
          onSelect={() => props.setActiveTool(tools.drawer)}
          toolTitle={tools.drawer.title}
          icon={tools.drawer.icon}
        />
        <ToolButton
          active={props.active_tool === tools.stickers ? true : false}
          onSelect={() => props.setActiveTool(tools.stickers)}
          toolTitle={tools.stickers.title}
          iconSize={{ width: 16, height: 16 }}
          icon={tools.stickers.icon}
        />
        <hr className="tw-w-30px tw-border-iron-grey tw-my-1" />
        <ToolButton
          toolTitle={tools.undo.title}
          icon={tools.undo.icon}
          iconSize={{ width: 16, height: 12 }}
        />
        <ToolButton
          toolTitle={tools.redo.title}
          className="tw-opacity-25"
          iconSize={{ width: 16, height: 12 }}
          icon={tools.redo.icon}
        />
      </div>
      <div className="tw-bg-white !tw-border-iron-grey  tw-shadow-md tw-rounded-md tw-p-1px tw-flex tw-flex-col tw-items-center tw-border tw-mt-3">
        <ToolButton
          active={props.active_tool === tools.note ? true : false}
          onSelect={() => props.setActiveTool(tools.note)}
          toolTitle={tools.note.title}
          iconSize={{ width: 18, height: 18 }}
          icon={tools.note.icon}
        />
        <ToolButton
          active={props.active_tool === tools.transcripe ? true : false}
          onSelect={() => props.setActiveTool(tools.transcripe)}
          toolTitle={tools.transcripe.title}
          iconSize={{ width: 20, height: 18 }}
          icon={tools.transcripe.icon}
        />
        <hr className="tw-w-30px tw-border-iron-grey tw-my-1" />
        <ToolButton
          active={props.active_tool === tools.blur ? true : false}
          onSelect={() => props.setActiveTool(tools.blur)}
          toolTitle={tools.blur.title}
          iconSize={{ width: 19, height: 18 }}
          icon={tools.blur.icon}
        />
        <ToolButton
          active={props.active_tool === tools.trim ? true : false}
          onSelect={() => props.setActiveTool(tools.trim)}
          toolTitle={tools.trim.title}
          iconSize={{ width: 20, height: 18 }}
          icon={tools.trim.icon}
        />
        <ToolButton
          active={props.active_tool === tools.thumbnail ? true : false}
          onSelect={() => props.setActiveTool(tools.thumbnail)}
          toolTitle={tools.thumbnail.title}
          iconSize={{ width: 22, height: 18 }}
          icon={tools.thumbnail.icon}
        />
        <ToolButton
          active={props.active_tool === tools.cta ? true : false}
          onSelect={() => props.setActiveTool(tools.cta)}
          toolTitle={tools.cta.title}
          iconSize={{ width: 17, height: 18 }}
          icon={tools.cta.icon}
        />
        <ToolButton
          active={props.active_tool === tools.download ? true : false}
          onSelect={() => props.setActiveTool(tools.download)}
          toolTitle={tools.download.title}
          iconSize={{ width: 20, height: 18 }}
          icon={tools.download.icon}
        />
        <hr className="tw-w-30px tw-border-iron-grey tw-my-1" />
        <ToolButton
          active={props.active_tool === tools.remove ? true : false}
          onSelect={() => setDeleteModalVisibility(true)}
          toolTitle={tools.remove.title}
          iconSize={{ width: 18, height: 18 }}
          icon={tools.remove.icon}
        />
        <ToolButton
          active={props.active_tool === tools.lock ? true : false}
          onSelect={() => props.setActiveTool(tools.lock)}
          toolTitle={tools.lock.title}
          iconSize={{ width: 16, height: 18 }}
          icon={tools.lock.icon}
        />
      </div>
      <ConfirmModal
        onOk={props.onWhiteboardDelete}
        onClose={() => setDeleteModalVisibility(false)}
        visible={deleteModalVisibility}
      />
    </div>
  );
};
export default ToolBar;
