import { Layer } from 'konva/lib/Layer';
import { Line } from 'konva/lib/shapes/Line';
import { Stage } from 'konva/lib/Stage';
import { IPencilGroupOptions } from '../toolsPanel/toolsOptions/interface/IPencilGroupOptions';
import { drawnName, getLayer } from './editorHelper';
import { currentPointerPosition } from './utils';

export interface IFreeDrawer {
  stage: Stage;
  options: IPencilGroupOptions;
  operation: GlobalCompositeOperation;
  saveHistory: () => void;
}

export type GlobalCompositeOperation = 'source-over' | 'destination-out';

export const initFreeDraw = ({
  stage,
  options,
  operation,
  saveHistory,
}: IFreeDrawer) => {
  stage.on('mousedown', () =>
    freeDrawMouseDownListener({ stage, options, operation, saveHistory }),
  );
};

const freeDrawMouseDownListener = ({
  stage,
  options,
  operation,
  saveHistory,
}: IFreeDrawer) => {
  const pos = stage.getRelativePointerPosition();
  const lastLine = new Line({
    name: operation === 'source-over' ? drawnName : 'erase',
    stroke: options.strokeColor,
    strokeWidth: options.strokeWidth,
    globalCompositeOperation: operation,
    lineCap: 'round',
    points: [pos.x, pos.y, pos.x, pos.y],
    draggable: true,
    shapeType: 'free',
    listening: false,
    pixelRatio: 1,
  });

  const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
  drawLayer?.add(lastLine);
  stage.on('mousemove', () => freeDrawMouseMoveListener(stage, lastLine));
  stage.on('mouseup', () => freeDrawMouseUpListener(stage, saveHistory));
};

const freeDrawMouseMoveListener = (stage: Stage, lastLine: Line) => {
  const pos = stage.getRelativePointerPosition();
  if (pos) {
    const newPoints = lastLine.points().concat([pos.x, pos.y]);
    lastLine.points(newPoints);
  }
};

const freeDrawMouseUpListener = (stage: Stage, saveHistory: () => void) => {
  stage?.off('mousemove');
  stage?.off('mouseup');
  saveHistory();
};
