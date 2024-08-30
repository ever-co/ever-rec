import React from 'react';
import { IToolsOptions } from './IToolsOptions';
import ColorSelector from './ColorSelector';
import AppInput from '@/content/components/controls/appInput/AppInput';
import { compareTools, ITool, tools } from '../tools';

interface IToolsOptionsProps {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  numPoints?: number;
  innerRadius?: number;
  outerRadius?: number;
  activeTool: ITool | null;
  onToolsOptionsChange: (options: IToolsOptions) => void;
}

const ToolsOptions: React.FC<IToolsOptionsProps> = ({
  fillColor,
  strokeColor,
  strokeWidth,
  numPoints,
  innerRadius,
  outerRadius,
  activeTool,
  onToolsOptionsChange,
}) => {
  const getOptions = (): IToolsOptions => ({
    fillColor,
    strokeColor,
    strokeWidth,
    numPoints,
    innerRadius,
    outerRadius,
  });

  const fillColorChangeHandler = (color: string) => {
    const options = getOptions();
    options.fillColor = color;
    onToolsOptionsChange(options);
  };

  const strokeColorChangeHandler = (color: string) => {
    const options = getOptions();
    options.strokeColor = color;
    onToolsOptionsChange(options);
  };

  const strokeWidthChangeHandler = ({ value }: { value: string }) => {
    const width: number = parseInt(value);
    if (!isNaN(width) && width >= 0) {
      const options = getOptions();
      options.strokeWidth = width;
      onToolsOptionsChange(options);
    }
  };

  const numPointsChangeHandler = ({ value }: { value: string }) => {
    const numPoints: number = parseInt(value);
    if (!isNaN(numPoints) && numPoints >= 3) {
      const options = getOptions();
      options.numPoints = numPoints;
      onToolsOptionsChange(options);
    }
  };

  const innerRadiusChangeHandler = ({ value }: { value: string }) => {
    const innerRadius: number = parseInt(value);
    if (!isNaN(innerRadius) && innerRadius > 0) {
      const options = getOptions();
      options.innerRadius = innerRadius;
      onToolsOptionsChange(options);
    }
  };

  const outerRadiusChangeHandler = ({ value }: { value: string }) => {
    const outerRadius: number = parseInt(value);
    if (!isNaN(outerRadius) && outerRadius > 0) {
      const options = getOptions();
      options.outerRadius = outerRadius;
      onToolsOptionsChange(options);
    }
  };

  return (
    <div className="tw-flex tw-items-center">
      <ColorSelector
        color={fillColor}
        onChange={fillColorChangeHandler}
        className="tw-mr-2"
      />
      {strokeWidth > 0 && (
        <ColorSelector
          color={strokeColor}
          onChange={strokeColorChangeHandler}
          className="tw-mr-2"
        />
      )}
      <AppInput
        value={strokeWidth.toString()}
        onChange={strokeWidthChangeHandler}
        type="number"
        dense
        label="Str. Width"
        labelClass="tw-text-xs"
        className="tw-mr-1 tw-w-28"
      />
      {compareTools(activeTool, tools.star) &&
        numPoints &&
        innerRadius &&
        outerRadius && (
          <>
            <AppInput
              value={numPoints.toString()}
              onChange={numPointsChangeHandler}
              type="number"
              dense
              label="Rays"
              labelClass="tw-text-xs"
              className="tw-mr-1 tw-w-28"
            />
            <AppInput
              value={innerRadius.toString()}
              onChange={innerRadiusChangeHandler}
              type="number"
              dense
              label="Inner"
              labelClass="tw-text-xs"
              className="tw-mr-1 tw-w-28"
            />
            <AppInput
              value={outerRadius.toString()}
              onChange={outerRadiusChangeHandler}
              type="number"
              dense
              label="Outer"
              labelClass="tw-text-xs"
              className="tw-mr-1 tw-w-28"
            />
          </>
        )}
    </div>
  );
};

export default ToolsOptions;
