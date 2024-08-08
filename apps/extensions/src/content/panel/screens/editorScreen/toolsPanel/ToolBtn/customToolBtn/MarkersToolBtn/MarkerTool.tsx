import React, { useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { IMarkerOptions } from '../../../toolsOptions/interface/IMarkerGroupOptions';
import ColorSelector from '../../../toolsOptions/ColorSelector';
import marker from '../../../../../../../assests/svg/tools-panel/design.svg';
import marker2 from '../../../../../../../assests/svg/tools-panel/design2.svg';
import classNames from 'classnames';
// import { Path } from 'react-konva';

interface IMarkerToolProps {
  isOpenEditTool: boolean;
  options: IMarkerOptions;
  active: boolean;
  onChange: (options: IMarkerOptions) => void;
  onToolChange: (tool: ITool) => void;
  onResetShape: () => void;
  title?: string;
}
const MarkerTool: React.FC<IMarkerToolProps> = ({
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
  const [activeMarker, setActiveMarker] = useState(marker);

  return (
    <ToolBtn
      toolTitle={tools.marker.title}
      large={true}
      isOpenEditTool={isOpenEditTool}
      active={active}
      placement="left"
      title={title}
      onSelect={() => {
        onResetShape();
        onToolChange(tools.marker);
        // infoMessage('We are working hard to add this feature!');
      }}
      icon={tools.marker.icon}
    >
      <div className="tw-flex tw-items-center tw-justify-center">
        <div>
          <div
            onClick={() => {
              onResetShape();
              onToolChange(tools.marker);
              onChange({
                id: '',
                text: '',
                type: 'number',
                fill: 'orange',
                position: { x: 0, y: 0 },
              });
              setActiveMarker(marker);
            }}
            className={classNames(
              `tw-cursor-pointer  tw-flex tw-items-center tw-justify-center tw-rounded tw-select-none tw-p-2 hover:tw-bg-conv-active tw-transition-all tw-m-1`,
              {
                'tw-bg-sub-btn': activeMarker === marker,
              },
            )}
          >
            <img src={marker} className="tw-w-70px tw-h-70px tw-max-w-none" />
          </div>

          <div
            onClick={() => {
              onResetShape();
              onToolChange(tools.marker);
              onChange({
                fill: 'rgb(9, 74, 177)',
                type: 'alphabet',
                id: '',
                text: '',
                position: { x: 0, y: 0 },
              });
              setActiveMarker(marker2);
            }}
            className={classNames(
              `tw-cursor-pointer  tw-flex tw-items-center tw-justify-center tw-rounded tw-select-none tw-p-2 hover:tw-bg-conv-active tw-transition-all tw-m-1`,
              {
                'tw-bg-sub-btn': activeMarker === marker2,
              },
            )}
          >
            <img src={marker2} className="tw-w-70px tw-h-70px tw-max-w-none" />
          </div>
        </div>

        <ColorSelector
          color={options.fill}
          onChange={(val) => optionsChangeHandler('fill', val)}
          className="tw-cursor-pointer tw-w-45px tw-h-25px"
        ></ColorSelector>
      </div>
    </ToolBtn>
  );
};

export default MarkerTool;
