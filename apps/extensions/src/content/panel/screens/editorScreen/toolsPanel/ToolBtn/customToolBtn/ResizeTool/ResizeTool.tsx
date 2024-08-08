import AppButton from '@/content/components/controls/appButton/AppButton';
import AppInput from '@/content/components/controls/appInput/AppInput';
import { Checkbox } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import resizeIcon from '@/content/assests/svg/tools-panel/resize.svg';
import { ITool, tools } from '../../../tools';
import ToolBtn from '../../ToolBtn';
import type { RadioChangeEvent } from 'antd';
import { Radio } from 'antd';
import PanelSplitter from '../../../PanelSplitter';

const MAX_WIDTH = 9999;
const MAX_HEIGHT = 9999;
const WIDTH_ERROR = 'Width pixel value too large!';
const HEIGHT_ERROR = 'Height pixel value too large!';

interface IResizeToolProps {
  active: boolean;
  isOpenEditTool: boolean;
  initialWidth: number;
  initialHeight: number;
  onResize: (widht: number, height: number) => void;
  onSelect: (tool: ITool | null) => void;
}

const ResizeTool: React.FC<IResizeToolProps> = ({
  active,
  initialWidth,
  isOpenEditTool,
  initialHeight,
  onResize,
  onSelect,
}) => {
  const subpanelRef = useRef<{
    closePanel: () => void;
  }>(null);

  const [width, setWidth] = useState<{ value: number; errors: string[] }>({
    value: initialWidth,
    errors: [],
  });

  const [height, setHeight] = useState<{ value: number; errors: string[] }>({
    value: initialHeight,
    errors: [],
  });
  const [value, setValue] = useState(1);
  const [ratio, setRatio] = useState<number>(initialWidth / initialHeight);

  useEffect(() => {
    setRatio(initialWidth / initialHeight);
  }, [initialHeight, initialWidth]);

  const [proportional, setProportional] = useState<boolean>(true);

  const onChange = (e: RadioChangeEvent) => {
    console.log('radio checked', e.target.value);
    setValue(e.target.value);
  };

  const widthChangeHandler = ({
    value,
    errors,
  }: {
    value: string;
    errors?: string[] | undefined;
  }): void => {
    if (parseInt(value) > MAX_WIDTH) {
      setWidth({
        value: parseInt(value),
        errors: [WIDTH_ERROR],
      });
    } else {
      setWidth({
        value: parseInt(value),
        errors: errors || [],
      });
    }

    if (!errors?.length && proportional) {
      setHeight({
        value: Math.round(parseInt(value) / ratio),
        errors: errors || [],
      });
    }
  };

  const heightChangeHandler = ({
    value,
    errors,
  }: {
    value: string;
    errors?: string[] | undefined;
  }): void => {
    if (parseInt(value) > MAX_HEIGHT) {
      setHeight({
        value: parseInt(value),
        errors: [HEIGHT_ERROR],
      });
    } else {
      setHeight({
        value: parseInt(value),
        errors: errors || [],
      });
    }

    if (ratio * parseInt(value) > MAX_WIDTH) return;

    if (!errors?.length && proportional) {
      setWidth({
        value: Math.round(ratio * parseInt(value)),
        errors: errors || [],
      });
    }
  };

  const valid = useMemo(() => {
    return !width.errors.length && !height.errors.length;
  }, [width, height]);

  const resizeClickHandler = () => {
    if (valid && value === 4) {
      onResize(width.value, height.value);
    }

    if (value === 3) {
      onResize(1920, 1080);
    }
    if (value === 2) {
      onResize(1366, 768);
    }
    if (value === 1) {
      onResize(854, 480);
    }
  };

  const closeSubpanelHandler = () => onSelect(null);

  const closeSubpanel = () => subpanelRef?.current?.closePanel();

  return (
    <ToolBtn
      isOpenEditTool={isOpenEditTool}
      onSelect={() => onSelect(tools.resize)}
      icon={resizeIcon}
      active={active}
      onSubpanelClose={closeSubpanelHandler}
      ref={subpanelRef}
      toolTitle={tools.resize.title}
      title="resize"
      placement="left"
    >
      <div className="tw-flex tw-flex-col tw-w-280px ">
        <h2 className="tw-text-xl tw-font-semibold tw-mb-2">
          Resize your images
        </h2>

        <Radio.Group onChange={onChange} value={value}>
          <Radio value={1}>
            {' '}
            <label> Small (scales to 854 x 480 pixels) </label>{' '}
          </Radio>
          <Radio value={2}>
            {' '}
            <label> Medium (scales to 1366 x 768 pixels) </label>{' '}
          </Radio>
          <Radio value={3}>
            {' '}
            <label> Large (scales to 1920 x 1080 pixels)</label>{' '}
          </Radio>
          <PanelSplitter />
          <Radio value={4}>
            {' '}
            <div className=" tw-flex tw-flex-row tw-items-center">
              <label>Custom</label>
              <div className="tw-flex tw-items-center tw-justify-between ">
                <AppInput
                  type="number"
                  value={width.value.toString()}
                  onChange={widthChangeHandler}
                  inputClass="tw-bg-transparent tw-border tw-border-solid tw-border-app-grey tw-rounded-3 tw-w-65px"
                  inputContainerClass="tw-mr-2 tw-ml-3"
                />
              </div>
              x
              <div className="tw-flex tw-items-center tw-justify-between ">
                <AppInput
                  type="number"
                  value={height.value.toString()}
                  onChange={heightChangeHandler}
                  inputClass="tw-text-xs tw-bg-transparent tw-border tw-border-solid tw-border-app-grey tw-rounded-3 tw-w-65px"
                  inputContainerClass="tw-mx-1"
                />
              </div>
              <label>pixels</label>
            </div>
          </Radio>
        </Radio.Group>
        {width.errors.length > 0 && value === 4 && (
          <span className="tw-text-sm tw-text-red">{WIDTH_ERROR}</span>
        )}
        {height.errors.length > 0 && value === 4 && (
          <span className="tw-text-sm tw-text-red tw-mb-2">{HEIGHT_ERROR}</span>
        )}
        <Checkbox
          checked={proportional}
          onChange={() => setProportional(!proportional)}
        >
          <span className="tw-text-black"> Proportional</span>
        </Checkbox>
        <div className="tw-mt-3 tw-flex tw-justify-end">
          <AppButton
            disabled={!valid && value === 4}
            className="tw-mr-2 tw-pb-1 tw-pt-1"
            onClick={resizeClickHandler}
          >
            <span>Resize</span>
          </AppButton>

          <AppButton
            bgColor="tw-bg-white"
            outlined
            onClick={closeSubpanel}
            className="tw-pb-1 tw-pt-1"
          >
            Cancel
          </AppButton>
        </div>
      </div>
    </ToolBtn>
  );
};

export default ResizeTool;
