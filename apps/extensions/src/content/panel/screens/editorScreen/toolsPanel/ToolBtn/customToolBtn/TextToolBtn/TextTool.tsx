import AppNumberSelector from '@/content/components/controls/appNumberSelector/AppNumberSelector';
import { Select } from 'antd';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import React, { useState } from 'react';
import { ITool, tools } from '../../../tools';
import ColorSelector from '../../../toolsOptions/ColorSelector';
import { ITextOptions } from '../../../toolsOptions/interface/ITextOptions';
import ToolSubPanelBtn from '../../components/ToolSubPanelBtn';
import ToolBtn from '../../ToolBtn';

//Icons
import boldIcon from '@/content/assests/svg/tools-panel/bold.svg';
import italicIcon from '@/content/assests/svg/tools-panel/italic.svg';
import underlineIcon from '@/content/assests/svg/tools-panel/underline.svg';
import alignCenterIcon from '@/content/assests/svg/tools-panel/align-center.svg';
import alignLeftIcon from '@/content/assests/svg/tools-panel/align-left.svg';
import alignRightIcon from '@/content/assests/svg/tools-panel/align-right.svg';
import WhiteTTIcon from '@/content/assests/svg/tools-panel/whiteTT.svg';
import BlackTTIcon from '@/content/assests/svg/tools-panel/blackTT.svg';
import BlacktIcon from '@/content/assests/svg/tools-panel/normalTt_black.svg';
import WhitetIcon from '@/content/assests/svg/tools-panel/normalTt_white.svg';
import WhiteT2Icon from '@/content/assests/svg/tools-panel/whiteT_2.svg';
import BlackT2Icon from '@/content/assests/svg/tools-panel/blackT_2.svg';
import StrokeIcon from '@/content/assests/svg/tools-panel/T(Stroke).svg';
import cross from '@/content/assests/svg/tools-panel/cross.svg';

interface ITextToolProps {
  isOpenEditTool: boolean;
  options: ITextOptions;
  active: boolean;
  onChange: (options: ITextOptions) => void;
  onToolChange: (tool: ITool) => void;
  onResetShape: () => void;
  title?: string;
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
  onToolChange,
  onResetShape,
  title,
}) => {
  const optionsChangeHandler = (field: string, value: any) => {
    onChange({ ...options, [field]: value });
  };

  const [activeButton, setActiveButton] = useState<boolean>(true);

  return (
    <ToolBtn
      isOpenEditTool={isOpenEditTool}
      onSelect={() => {
        onToolChange(tools.text);
        onResetShape();
      }}
      icon={tools.text.icon}
      active={active}
      placement="left"
      title={title}
      large={true}
      toolTitle={tools.text.title}
    >
      <div className="tw-flex tw-flex-col tw-items-start  ">
        <Select
          value={options.fontFamily}
          style={{ fontFamily: options.fontFamily }}
          onChange={(val) => optionsChangeHandler('fontFamily', val)}
          className="tw-w-full tw-rounded tw-bg-white app-selectable"
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
            toolTitle="Bold"
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
            toolTitle="Italic"
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
            toolTitle="Underline"
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
            toolTitle="Line-through"
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
            toolTitle="Left"
          />

          <ToolSubPanelBtn
            icon={alignCenterIcon}
            active={options.align === 'center' ? true : false}
            onSelect={() => optionsChangeHandler('align', 'center')}
            toolTitle="Center"
          />

          <ToolSubPanelBtn
            icon={alignRightIcon}
            active={options.align === 'right' ? true : false}
            onSelect={() => optionsChangeHandler('align', 'right')}
            toolTitle="Right"
          />

          <ToolSubPanelBtn
            icon={
              options.fontVariant === 'all-small-caps'
                ? WhiteTTIcon
                : BlackTTIcon
            }
            active={options.fontVariant === 'all-small-caps' ? true : false}
            onSelect={() => {
              if (activeButton) {
                setActiveButton(false);
                infoMessage('This option is not supported yet');
                setTimeout(() => {
                  setActiveButton(true);
                }, 4000);
              }

              // options.fontVariant !== 'all-small-caps'
              //   ? optionsChangeHandler('fontVariant', 'all-small-caps')
              //   : null;
            }}
            toolTitle="Lowercase"
          />
          <ToolSubPanelBtn
            icon={options.fontVariant === 'normal' ? WhitetIcon : BlacktIcon}
            active={options.fontVariant === 'normal' ? true : false}
            onSelect={() => {
              options.fontVariant !== 'normal'
                ? optionsChangeHandler('fontVariant', 'normal')
                : null;
            }}
            toolTitle="Capitalize"
          />
          <ToolSubPanelBtn
            icon={
              options.fontVariant === 'small-caps' ? WhiteT2Icon : BlackT2Icon
            }
            active={options.fontVariant === 'small-caps' ? true : false}
            onSelect={() => {
              options.fontVariant !== 'small-caps'
                ? optionsChangeHandler('fontVariant', 'small-caps')
                : null;
            }}
            toolTitle="Uppercase"
          />
        </div>
      </div>
    </ToolBtn>
  );
};

export default TextTool;
