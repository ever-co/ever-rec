import { IArrowGroupOptions } from 'app/interfaces/tools_interfaces/IArrowGroupOptions';
import StrokeWidthSelector from 'components/pagesComponents/_editorScreen/toolsPanel/toolsOptions/strokeWidthSelector/StrokeWidthSelector';
import React from 'react';
import { compareTools, ITool, tools } from '../../../tools';
import ColorSelector from '../../../toolsOptions/ColorSelector';
import ToolSubPanelBtn from '../../components/ToolSubPanelBtn';
import ToolBtn from '../../ToolBtn';
import styles from './arrowTool.module.scss';

interface IArrowToolProps {
  options: IArrowGroupOptions;
  activeTool: ITool | null;
  isOpenEditTool: any;
  onChange: (options: IArrowGroupOptions) => void;
  onToolChange: (tool: ITool) => void;
  onResetShape: () => void;
  title?: string;
}

const ArrowTool: React.FC<IArrowToolProps> = ({
  options,
  activeTool,
  isOpenEditTool,
  onChange,
  onToolChange,
  onResetShape,
  title,
}) => {
  const activeArrowTool = (): ITool => {
    return (
      ([tools.arrow, tools.line, tools.curvaArrow, tools.direction].some(
        (tool) => compareTools(activeTool, tool),
      )
        ? activeTool
        : tools.arrow) || tools.arrow
    );
  };

  const isActive = (tool: ITool): boolean => compareTools(activeTool, tool);

  const optionsChangeHandler = (field: string, value: any) => {
    onChange({ ...options, [field]: value });
  };

  return (
    <ToolBtn
      isOpenEditTool={isOpenEditTool}
      onSelect={() => {
        onToolChange(activeArrowTool());
        onResetShape();
      }}
      icon={activeArrowTool().icon}
      active={isActive(activeArrowTool())}
      title={title}
      large={true}
      toolTitle={tools.arrow.title}
    >
      <div>
        <div className={styles.container}>
          <ToolSubPanelBtn
            onSelect={() => onToolChange(tools.arrow)}
            icon={tools.arrow.icon}
            active={isActive(tools.arrow)}
            toolTitle={tools.arrow.title}
          />

          <ToolSubPanelBtn
            onSelect={() => onToolChange(tools.line)}
            icon={tools.line.icon}
            active={isActive(tools.line)}
            toolTitle={tools.line.title}
          />

          <ToolSubPanelBtn
            onSelect={() => onToolChange(tools.curvaArrow)}
            icon={tools.curvaArrow.icon}
            active={isActive(tools.curvaArrow)}
            toolTitle={tools.curvaArrow.title}
          />

          <ToolSubPanelBtn
            onSelect={() => onToolChange(tools.direction)}
            icon={tools.direction.icon}
            active={isActive(tools.direction)}
            toolTitle={tools.direction.title}
          />
        </div>

        <div className={styles.flexContainer}>
          <ColorSelector
            color={options.color}
            onChange={(val) => optionsChangeHandler('color', val)}
            className={styles.selector}
          />

          <StrokeWidthSelector
            width={options.width}
            onChange={(val) => optionsChangeHandler('width', val)}
          />
        </div>
      </div>
    </ToolBtn>
  );
};

export default ArrowTool;
