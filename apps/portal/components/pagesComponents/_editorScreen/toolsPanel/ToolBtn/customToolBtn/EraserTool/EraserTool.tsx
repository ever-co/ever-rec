/* eslint-disable @typescript-eslint/no-unused-expressions */
import React from 'react';
import { ITool, tools } from '../../../tools';
import { IPencilGroupOptions } from '../../../toolsOptions/interface/IPencilGroupOptions';
import StrokeWidthSelector from '../../../toolsOptions/strokeWidthSelector/StrokeWidthSelector';
import ToolBtn from '../../ToolBtn';
import styles from './eraserTool.module.scss';

interface IEraserToolProps {
  isOpenEditTool: boolean;
  options: IPencilGroupOptions;
  active: boolean;
  onChange: (options: IPencilGroupOptions) => void;
  onToolChange: (tool: ITool) => void;
  onResetShape: () => void;
}

const EraserTool: React.FC<IEraserToolProps> = ({
  options,
  active,
  isOpenEditTool,
  onChange,
  onToolChange,
  onResetShape,
}) => {
  const optionsChangeHandler = (field: string, value: any) => {
    onChange({ ...options, [field]: value });
  };

  return (
    <ToolBtn
      isOpenEditTool={isOpenEditTool}
      title="eraser"
      toolTitle="Eraser"
      onSelect={() => {
        onToolChange(tools.eraser);
        onResetShape();

        {
          options.strokeWidth > 16
            ? onChange({ strokeWidth: 2, strokeColor: 'rgb(0,0,0)' })
            : null;
        }
      }}
      icon={tools.eraser.icon}
      active={active}
      placement="right"
    >
      <div className={styles.container}>
        <div className={styles.flexContainer}>
          <StrokeWidthSelector
            width={options.strokeWidth}
            onChange={(val) => {
              optionsChangeHandler('strokeWidth', val);
            }}
          />
        </div>
      </div>
    </ToolBtn>
  );
};

export default EraserTool;
