import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Shape } from 'konva/lib/Shape';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage } from 'konva/lib/Stage';
import { initPointerTransformer } from './transformerHelper';

import { blurName, getLayer } from './editorHelper';
import { Rect } from 'konva/lib/shapes/Rect';

export interface IShapeDrawer {
  stage: Stage;
  stageScale: number;
  saveHistory: () => void;
  mainScale: number;
  resized: boolean;
}

export const initBlurDraw = ({
  stage,
  stageScale,
  saveHistory,
  mainScale,
  resized,
}: IShapeDrawer) => {
  stage.on('mousedown', (e) => {
    if (e.target.getAttr('shapeType') !== 'blur') {
      drawBlurMouseDownListener({
        stage,
        stageScale,
        saveHistory,
        mainScale,
        resized,
      });
    }
  });
};

const drawBlurMouseDownListener = async ({
  stage,
  stageScale,
  saveHistory,
  mainScale,
  resized,
}: IShapeDrawer) => {
  const scaleCoefficient = stageScale / 100;
  const blurScale = mainScale * scaleCoefficient;

  let layer: Layer | undefined = getLayer(stage, '#drawLayer');
  if (!layer) {
    layer = new Konva.Layer({ id: '#drawLayer' });
    stage.add(layer);
  }

  const image = await captureImage(
    2,
    2,
    stage.attrs.width,
    stage.attrs.height,
    stage,
  );

  const shape = new Rect({
    id: 'blurred',
    name: blurName,
    x: stage.getRelativePointerPosition().x,
    y: stage.getRelativePointerPosition().y,
    width: 1,
    height: 1,
    draggable: true,
    fillPatternImage: image,
    fillPatternOffset: {
      x: stage.getRelativePointerPosition().x * blurScale,
      y: stage.getRelativePointerPosition().y * blurScale,
    },
    fillPatternScaleX: 1 / blurScale,
    fillPatternScaleY: 1 / blurScale,
    fillPatternOffsetX: stage.getRelativePointerPosition().x * blurScale,
    fillPatternOffsetY: stage.getRelativePointerPosition().y * blurScale,
    shadowBlur: 0.1,
    blurRadius: 10,
    visible: false,
    shapeType: 'blur',
    pixelRatio: 1,
  });

  stage.clearCache();
  if (layer) {
    initPointerTransformer(stage, [shape], saveHistory);
    layer.add(shape);

    stage.on('mousemove', () =>
      drawBlurMouseMoveListener(stage, shape, layer as Layer, blurScale),
    );
    stage?.on('mouseup', () =>
      drawBlurMouseUpListener(stage, shape, saveHistory),
    );
    shape.on('transform', () => {
      drawBlurDragmoveListener(stage, shape, blurScale);
    });

    initEventListeners(stage, shape, layer, blurScale);
  }
};

export const initEventListeners = (
  stage: Stage,
  shape: Shape,
  layer: Layer,
  scaleCoefficient: number,
) => {
  stage?.on('dragstart', () =>
    drawBlurDragstartListener(stage, shape, scaleCoefficient),
  );
  shape?.on('transform', (event) =>
    drawBlureTransformListener(event, stage, shape, scaleCoefficient),
  );
  shape?.on('transformend', () =>
    drawBlureTransformedListener(shape, scaleCoefficient),
  );
};

const drawBlureTransformListener = async (
  event: KonvaEventObject<any>,
  stage: Stage,
  shape: Shape,
  scaleCoefficient: number,
) => {
  stage?.off('mousemove');
  shape?.fillPatternScaleX(1 / (event.target.attrs.scaleX * scaleCoefficient));
  shape?.fillPatternScaleY(1 / (event.target.attrs.scaleY * scaleCoefficient));
  shape?.fillPatternRotation(360 - event.target.attrs.rotation);
  if (shape?.attrs.width && shape?.attrs.height) {
    shape = shape.cache();
  }
  shape?.filters([Konva.Filters.Blur]);
};

const drawBlureTransformedListener = async (
  shape: Shape,
  scaleCoefficient: number,
) => {
  shape?.fillPatternOffsetX(shape.attrs.x * scaleCoefficient);
  shape?.fillPatternOffsetY(shape.attrs.y * scaleCoefficient);
  if (shape.attrs.width && shape.attrs.height) {
    shape = shape.cache();
  }
  shape?.filters([Konva.Filters.Blur]);
};

const drawBlurDragmoveListener = async (
  stage: Stage,
  shape: Shape,
  scaleCoefficient: number,
) => {
  stage?.off('mousemove');
  shape?.fillPatternOffsetX(shape.attrs.x * scaleCoefficient);
  shape?.fillPatternOffsetY(shape.attrs.y * scaleCoefficient);
  if (shape?.attrs.width && shape?.attrs.height) {
    shape = shape.cache();
  }
  shape?.filters([Konva.Filters.Blur]);
};

const drawBlurDragstartListener = async (
  stage: Stage,
  shape: Shape,
  scaleCoefficient: number,
) => {
  if (shape.parent) {
    stage?.on('dragend', () => drawBlurDragedListener(stage));
    stage?.on('dragmove', () =>
      drawBlurDragmoveListener(stage, shape, scaleCoefficient),
    );
  }
};

const drawBlurDragedListener = async (stage: Stage) => {
  stage?.off('dragend');
  stage?.off('dragmove');
};

const drawBlurMouseMoveListener = async (
  stage: Stage,
  shape: Shape,
  layer: Layer,
  scaleCoefficient: number,
) => {
  shape.show();
  const x = stage.getRelativePointerPosition().x;
  const y = stage.getRelativePointerPosition().y;
  const width = x - shape.x();
  const height = y - shape.y();
  if (shape?.attrs.width && shape?.attrs.height) {
    shape = shape.cache();
  }
  shape?.filters([Konva.Filters.Blur]);
  shape?.width(width);
  shape?.height(height);
};

const drawBlurMouseUpListener = (
  stage: Stage,
  shape: Shape,
  saveHistory: () => void,
) => {
  stage?.off('mousemove');
  stage?.off('mouseup');

  /**
   * Check figure for visiable content.
   */
  if (!shape.attrs.visible) {
    shape?.off('transform');
    shape?.off('transformend');
    shape.destroy();
  } else {
    saveHistory();
  }
};

const captureImage = async (
  x: number,
  y: number,
  width: number,
  height: number,
  stage: Stage,
): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    try {
      stage?.toImage({
        x,
        y,
        width,
        height,
        callback: (image) => {
          resolve(image);
        },
      });
    } catch (e: any) {
      reject(e);
    }
  });
};
