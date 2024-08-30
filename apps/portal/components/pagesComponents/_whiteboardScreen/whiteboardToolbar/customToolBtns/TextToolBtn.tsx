import AppNumberSelector from 'components/controls/AppNumberSelector';
import { Select } from 'antd';
import React from 'react';
import { ITool, tools } from '../whiteboard_tools';
import ColorSelector from '../../../_editorScreen/toolsPanel/toolsOptions/ColorSelector';
import { ITextOptions } from 'app/interfaces/tools_interfaces/ITextOptions';
import ToolSubPanelBtn from '../../../_editorScreen/toolsPanel/ToolBtn/components/ToolSubPanelBtn';
import ToolButton from '../ToolButton';
import { infoMessage } from 'app/services/helpers/toastMessages';

//Icons
import boldIcon from 'public/assets/svg/tools-panel/bold.svg';
import italicIcon from 'public/assets/svg/tools-panel/italic.svg';
import underlineIcon from 'public/assets/svg/tools-panel/underline.svg';
import alignCenterIcon from 'public/assets/svg/tools-panel/align-center.svg';
import alignLeftIcon from 'public/assets/svg/tools-panel/align-left.svg';
import alignRightIcon from 'public/assets/svg/tools-panel/align-right.svg';
import WhiteTTIcon from 'public/assets/svg/tools-panel/whiteTT.svg';
import BlackTTIcon from 'public/assets/svg/tools-panel/blackTT.svg';
import BlacktIcon from 'public/assets/svg/tools-panel/normalTt_black.svg';
import WhitetIcon from 'public/assets/svg/tools-panel/normalTt_white.svg';
import WhiteT2Icon from 'public/assets/svg/tools-panel/whiteT_2.svg';
import BlackT2Icon from 'public/assets/svg/tools-panel/blackT_2.svg';
import StrokeIcon from 'public/assets/svg/tools-panel/T(Stroke).svg';
import cross from 'public/assets/svg/tools-panel/cross.svg';

interface ITextToolProps {
  isOpenEditTool: boolean;
  options: ITextOptions;
  active: boolean;
  onChange: (options: ITextOptions) => void;
  setActiveTool: (tool: ITool) => void;
  onResetShape: () => void;
  title?: string;
  iconMore?: any;
}

const fonts: string[] = [
  'Times New Roman',
  'Arial',
  'Craft Girls',
  'Limelight',
  'Roboto',
  'Octavia',
  'Avenir Next Cyr',
];

const TextTool: React.FC<ITextToolProps> = ({
  options,
  isOpenEditTool,
  active,
  onChange,
  setActiveTool,
  onResetShape,
  title,
  iconMore,
}) => {
  const optionsChangeHandler = (field: string, value: any) => {
    onChange({ ...options, [field]: value });
  };

  return (
    <ToolButton
      isOpenEditTool={isOpenEditTool}
      onSelect={() => {
        setActiveTool(tools.text);
        onResetShape();
      }}
      icon={tools.text.icon}
      active={active}
      title={title}
      toolTitle={tools.text.title}
      iconSize={{ width: 16, height: 12 }}
    >
      <div className="tw-flex tw-flex-col tw-items-start tw-p-3 ">
        <Select
          value={options.fontFamily}
          style={{ fontFamily: options.fontFamily }}
          onChange={(val) => optionsChangeHandler('fontFamily', val)}
          className="tw-w-full tw-rounded tw-bg-primary-violet app-selectable"
        >
          {fonts.map((font, index) => (
            <Select.Option
              key={`font_${index}`}
              value={font}
              className="app-selectable"
              style={{ fontFamily: font }}
            >
              {font}
            </Select.Option>
          ))}
        </Select>

        <div className="tw-flex tw-items-center tw-justify-between tw-mt-2 tw-w-full">
          <ToolSubPanelBtn
            icon={boldIcon}
            active={options.fontStyle?.includes('bold') ? true : false}
            onSelect={() => {
              options.fontStyle === ''
                ? optionsChangeHandler('fontStyle', 'bold')
                : options.fontStyle === 'italic'
                  ? optionsChangeHandler('fontStyle', 'italic bold')
                  : options.fontStyle === 'italic bold'
                    ? optionsChangeHandler('fontStyle', 'italic')
                    : optionsChangeHandler('fontStyle', '');
            }}
          />

          <ToolSubPanelBtn
            icon={italicIcon}
            active={options.fontStyle?.includes('italic') ? true : false}
            onSelect={() => {
              options.fontStyle === ''
                ? optionsChangeHandler('fontStyle', 'italic')
                : options.fontStyle === 'bold'
                  ? optionsChangeHandler('fontStyle', 'italic bold')
                  : options.fontStyle === 'italic bold'
                    ? optionsChangeHandler('fontStyle', 'bold')
                    : optionsChangeHandler('fontStyle', '');
            }}
          />

          <ToolSubPanelBtn
            icon={underlineIcon}
            active={options.textDecoration === 'underline' ? true : false}
            onSelect={() => {
              options.textDecoration === '' ||
              options.textDecoration === 'line-through'
                ? optionsChangeHandler('textDecoration', 'underline')
                : optionsChangeHandler('textDecoration', '');
            }}
          />

          <ToolSubPanelBtn
            icon={cross}
            active={
              options.textDecoration?.includes('line-through') ? true : false
            }
            onSelect={() => {
              options.textDecoration === '' ||
              options.textDecoration === 'underline'
                ? optionsChangeHandler('textDecoration', 'line-through')
                : optionsChangeHandler('textDecoration', '');
            }}
          />

          <ColorSelector
            color={options.stroke}
            onChange={(val) => optionsChangeHandler('stroke', val)}
            icon={StrokeIcon}
            className="tw-cursor-pointer"
          />
          <div className=" tw-rounded-2xl  tw-bg-white tw-flex tw-justify-center tw-my-5px tw-ml-10px tw-border-2 tw-border-dark-grey">
            {' '}
            <AppNumberSelector
              value={options.fontSize}
              max={128}
              min={8}
              valuesArr={[]}
              light
              step={8}
              onChange={(val) => optionsChangeHandler('fontSize', val)}
            />
          </div>
        </div>

        <div className="tw-flex tw-justify-between tw-mt-2 ">
          <ColorSelector
            color={options.fill}
            onChange={(val) => optionsChangeHandler('fill', val)}
            className="tw-mr-2 tw-cursor-pointer"
          ></ColorSelector>

          <ToolSubPanelBtn
            icon={alignLeftIcon}
            active={options.align === 'left' ? true : false}
            onSelect={() => optionsChangeHandler('align', 'left')}
          />

          <ToolSubPanelBtn
            icon={alignCenterIcon}
            active={options.align === 'center' ? true : false}
            onSelect={() => optionsChangeHandler('align', 'center')}
          />

          <ToolSubPanelBtn
            icon={alignRightIcon}
            active={options.align === 'right' ? true : false}
            onSelect={() => optionsChangeHandler('align', 'right')}
          />

          <ToolSubPanelBtn
            icon={
              options.fontVariant === 'all-small-caps'
                ? WhiteTTIcon
                : BlackTTIcon
            }
            active={options.fontVariant === 'all-small-caps' ? true : false}
            onSelect={() => {
              infoMessage('This option is not supported yet');
              // options.fontVariant !== 'all-small-caps'
              //   ? optionsChangeHandler('fontVariant', 'all-small-caps')
              //   : null;
            }}
          />
          <ToolSubPanelBtn
            icon={options.fontVariant === 'normal' ? WhitetIcon : BlacktIcon}
            active={options.fontVariant === 'normal' ? true : false}
            onSelect={() => {
              // eslint-disable-next-line @typescript-eslint/no-unused-expressions
              options.fontVariant !== 'normal'
                ? optionsChangeHandler('fontVariant', 'normal')
                : null;
            }}
          />
          <ToolSubPanelBtn
            icon={
              options.fontVariant === 'small-caps' ? WhiteT2Icon : BlackT2Icon
            }
            active={options.fontVariant === 'small-caps' ? true : false}
            onSelect={() => {
              // eslint-disable-next-line @typescript-eslint/no-unused-expressions
              options.fontVariant !== 'small-caps'
                ? optionsChangeHandler('fontVariant', 'small-caps')
                : null;
            }}
          />
        </div>
      </div>
    </ToolButton>
  );
};

export default TextTool;
