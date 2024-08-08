import { Layer } from 'konva/lib/Layer';
import { Line } from 'konva/lib/shapes/Line';
import { Stage } from 'konva/lib/Stage';
import { IPencilGroupOptions } from '../../_editorScreen/toolsPanel/toolsOptions/interface/IPencilGroupOptions';

import {
  drawnName,
  getLayer,
} from '../../_editorScreen/editorHelpers/editorHelper';
import { currentPointerPosition } from '../../_editorScreen/editorHelpers/utils';

export interface IFreeDrawer {
  stage: Stage;
  options: IPencilGroupOptions;
  operation: GlobalCompositeOperation;
  saveHistory?: () => void;
}

export type GlobalCompositeOperation = 'source-over' | 'destination-out';

export const initFreeDraw = ({
  stage,
  options,
  operation,
  saveHistory,
}: IFreeDrawer) => {
  stage.on('mousedown', (e) => {
    if (e.target.getAttr('shapeType') !== 'free') {
      freeDrawMouseDownListener({
        stage,
        options,
        operation,
        saveHistory,
      });
    }
  });
};

const freeDrawMouseDownListener = ({
  stage,
  options,
  operation,
  saveHistory,
}: IFreeDrawer) => {
  const pos = currentPointerPosition(stage);
  const lastLine = new Line({
    name: operation === 'source-over' ? drawnName : '',
    stroke: options.strokeColor,
    strokeWidth: options.strokeWidth,
    globalCompositeOperation: operation,
    points: [pos.x, pos.y, pos.x, pos.y],
    draggable: true,
    shapeType: 'free',
    listening: operation === 'source-over' ? true : false,
    pixelRatio: 1,
    lineCap: 'round',
    lineJoin: 'round',
  });

  const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
  drawLayer?.add(lastLine);
  stage.on('mousemove', () => freeDrawMouseMoveListener(stage, lastLine));
  stage.on('mouseup', () => freeDrawMouseUpListener(stage, saveHistory));
};

const freeDrawMouseMoveListener = (stage: Stage, lastLine: Line) => {
  const pos = currentPointerPosition(stage);
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
