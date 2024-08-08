import React, { useState } from 'react';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import { IMarkerOptions } from 'app/interfaces/tools_interfaces/IMarkerGroupOptions';
import marker from 'public/images/design.svg';
import marker2 from 'public/images/design2.svg';
import AppSvg from 'components/elements/AppSvg';
import ColorSelector from '../../../toolsOptions/ColorSelector';
import classNames from 'classnames';
import styles from './markerTool.module.scss';
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
  const [activeMarker, setActiveMarker] = useState(marker.src);

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
      <div className={styles.flexContainer}>
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
              setActiveMarker(marker.src);
            }}
            className={classNames(
              styles.innerContainer,
              activeMarker === marker.src ? styles.bgColor : '',
            )}
          >
            <AppSvg size="70px" path={marker.src} />
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
              setActiveMarker(marker2.src);
            }}
            className={classNames(
              styles.innerContainer,
              activeMarker === marker2.src ? styles.bgColor : '',
            )}
          >
            <AppSvg size="70px" path={marker2.src} />
          </div>
        </div>

        <ColorSelector
          color={options.fill}
          onChange={(val) => optionsChangeHandler('fill', val)}
          className={styles.selector}
        ></ColorSelector>
      </div>
    </ToolBtn>
  );
};

export default MarkerTool;
