import { Layer } from 'konva/lib/Layer';
import { Shape } from 'konva/lib/Shape';
import { Circle } from 'konva/lib/shapes/Circle';
import { Line } from 'konva/lib/shapes/Line';
import { RegularPolygon } from 'konva/lib/shapes/RegularPolygon';
import { Ellipse } from 'konva/lib/shapes/Ellipse';
import { Rect } from 'konva/lib/shapes/Rect';
import { Star } from 'konva/lib/shapes/Star';
import { Stage } from 'konva/lib/Stage';
import { compareTools, ITool, tools } from '../toolsPanel/tools';
import { IShapeGroupOptions } from '../toolsPanel/toolsOptions/interface/IShapeGroupOptions';
import { drawnName, getLayer } from './editorHelper';
import { heartSceneFunc } from './drawerHelpers';
import { initPointerTransformer } from './transformerHelper';
import {
  drawBlurDragmoveListener,
  drawBlurMouseMoveListener,
  drawBlurMouseUpListener,
  initEventListeners,
} from './blurDrawer';

export interface IShapeDrawer {
  stage: Stage;
  activeTool: ITool;
  options: IShapeGroupOptions;
  saveHistory: () => void;
  stageScale: number;
}

export const initShapeDraw = ({
  stage,
  activeTool,
  options,
  saveHistory,
  stageScale,
}: IShapeDrawer) => {
  stage.on('mousedown', (e) => {
    const target = e.target.getAttr('shapeType');
    if (
      target !== 'heart' &&
      target !== 'elipse' &&
      target !== 'rect' &&
      target !== 'star' &&
      target !== 'triangle' &&
      target !== 'square' &&
      target !== 'comment' &&
      target !== 'blob'
    ) {
      drawShapeMouseDownListener({
        stage,
        activeTool,
        options,
        saveHistory,
        stageScale,
      });
    }
  });
};

const drawShapeMouseDownListener = ({
  stage,
  activeTool,
  options,
  saveHistory,
  stageScale,
}: IShapeDrawer) => {
  const scaleCoefficient = stageScale / 100;
  // Creating Shape after click
  const blurScale = stageScale * scaleCoefficient;

  const shapeOptions: any = {
    name: drawnName,
    x: stage?.getRelativePointerPosition()?.x || 0,
    y: stage?.getRelativePointerPosition()?.y || 0,
    width: 1,
    height: 1,
    draggable: true,
    // fillEnabled: false,
    scaleX: scaleCoefficient,
    scaleY: scaleCoefficient,
    stroke: options.strokeColor,
    fill: options.fillColor,
    strokeWidth: options.strokeWidth,
    strokeScaleEnabled: false,
    visible: true,
    pixelRatio: 1,
  };

  console.log('shapeOptions:', shapeOptions);
  /**
   * set additional options fot figure with type "circle"
   */
  if (compareTools(activeTool, tools.elipse)) {
    shapeOptions.shapeType = 'elipse';
  }

  /**
   * set additional options fot figure with type "rectangel"
   */
  if (compareTools(activeTool, tools.rect)) {
    shapeOptions.shapeType = 'rect';
    shapeOptions.x = stage?.getRelativePointerPosition()?.x || 0;
    shapeOptions.y = stage?.getRelativePointerPosition()?.y || 0;
  }

  /**
   * set additional options fot figure with type "star"
   */
  if (compareTools(activeTool, tools.star)) {
    shapeOptions.numPoints = 5;
    shapeOptions.innerRadius = 18;
    shapeOptions.outerRadius = 32;
    shapeOptions.shapeType = 'star';
  }

  /**
   * set additional options fot figure with type "triangle"
   */
  if (compareTools(activeTool, tools.triangle)) {
    shapeOptions.sides = 3;
    shapeOptions.shapeType = 'triangle';
  }

  /**
   * set additional options fot figure with type "square"
   */
  if (compareTools(activeTool, tools.square)) {
    shapeOptions.sides = 4;
    shapeOptions.rotation = 45;
    shapeOptions.shapeType = 'square';
  }

  /**
   * set additional options fot figure with type "comment"
   */
  if (compareTools(activeTool, tools.comment)) {
    shapeOptions.points = [0, 0, 80, 0, 80, 60, 12, 60, 0, 80];
    shapeOptions.closed = true;
    shapeOptions.tension = 0.025;
    shapeOptions.shapeType = 'comment';
    shapeOptions.x = (stage?.getRelativePointerPosition()?.x || 0) - 4;
    shapeOptions.y = (stage?.getRelativePointerPosition()?.y || 0) - 2;
  }

  /**
   * set additional options fot figure with type "blob"
   */
  if (compareTools(activeTool, tools.blob)) {
    shapeOptions.points = [0, 0, 60, 0, 60, 60, 0, 60];
    shapeOptions.closed = true;
    shapeOptions.tension = 0.1;
    shapeOptions.shapeType = 'blob';
    shapeOptions.x = (stage?.getRelativePointerPosition()?.x || 0) + 2;
    shapeOptions.y = (stage?.getRelativePointerPosition()?.y || 0) + 2;
  }

  /**
   * set additional options fot figure with type "heart"
   */
  if (compareTools(activeTool, tools.heart)) {
    shapeOptions.x = stage?.getRelativePointerPosition()?.x || 0;
    shapeOptions.y = stage?.getRelativePointerPosition()?.y || 0;
    shapeOptions.sceneFunc = heartSceneFunc;
    shapeOptions.shapeType = 'heart';
  }

  const shape: Shape | null = getShapeByTool(activeTool, shapeOptions);
  if (shape) {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    drawLayer?.add(shape);
    // stage.on('mousemove', () => drawShapeMouseMoveListener(stage, shape));
    stage?.on('mouseup', () =>
      drawShapeMouseUpListener(stage, shape, saveHistory),
    );
  }

  let layer: Layer | undefined = getLayer(stage, '#drawLayer');
  stage.clearCache();
  if (layer) {
    initPointerTransformer(stage, [shape], saveHistory);
    layer.add(shape);
    stage.on('mousemove', () => drawShapeMouseMoveListener(stage, shape));
    stage?.on('mouseup', () =>
      drawShapeMouseUpListener(stage, shape, saveHistory),
    );
    //shape.on('transform', () => {
    //  drawBlurDragmoveListener(stage, shape, blurScale);
    //});

    initEventListeners(stage, shape, layer, blurScale);
  }
};

const drawShapeMouseMoveListener = (stage: Stage, shape: Shape) => {
  //console.log('stage-scale', stage);
  console.log('stage-scale', shape);
  const x = stage.getRelativePointerPosition()?.x || 0;
  const y = stage.getRelativePointerPosition()?.y || 0;
  let width = x - shape.x();
  let height = y - shape.y();

  // Handle specific shapes that use scaling
  if (['blob', 'comment'].includes(shape.attrs.shapeType)) {
    shape.scaleX(width / shape.width());
    shape.scaleY(height / shape.height());
  }
  if (['circle', 'elipse'].includes(shape.attrs.shapeType)) {
    shape.width(width * 2);
    shape.height(height * 2);
  } else if (['triangle', 'star'].includes(shape.attrs.shapeType)) {
    shape.width(width * 4);
    shape.height(height * 4);
  } else {
    shape.width(width);
    shape.height(height);
  }
  // Ensure positive dimensions for circles/ellipses
  //if (['circle', 'ellipse', 'star'].includes(shape.attrs.shapeType)) {
  //  width = Math.abs(width * 2);
  //  height = Math.abs(height * 2);
  //}
  //}
};

// const drawShapeMouseMoveListener = (stage: Stage, shape: Shape) => {
//   // shape.show();
//   const x = stage?(.getRelativePointerPosition()?.x;
//   || 0) const y = stage?(.getRelativePointerPosition()?.y;
//   || 0) let width = x - shape.x();
//   let height = y - shape.y();

//   if (
//     shape.attrs.shapeType == 'heart' ||
//     shape.attrs.shapeType == 'blob' ||
//     shape.attrs.shapeType == 'comment'
//   ) {
//     shape.scaleX(width / shape.width());
//     shape.scaleY(height / shape.height());
//     width = shape.width();
//     height = shape.height();
//   }

//   if (
//     [Circle, Ellipse, Star].some((shapeClass) => shape instanceof shapeClass)
//   ) {
//     width = Math.abs(width);
//     height = Math.abs(height);
//   }

//   shape.width(width);
//   shape.height(height);
// };

const drawShapeMouseUpListener = (
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
    shape.destroy();
  } else {
    saveHistory();
  }
};

const getShapeByTool = (activeTool: ITool, config: any): Shape | null => {
  switch (activeTool.tool) {
    case tools.rect.tool:
      return new Rect(config);
    case tools.elipse.tool:
      return new Ellipse(config);
    case tools.circle.tool:
      return new Circle(config);
    case tools.star.tool:
      return new Star(config);
    case tools.triangle.tool:
      return new RegularPolygon(config);
    case tools.square.tool:
      return new RegularPolygon(config);
    case tools.heart.tool:
      return new Shape(config);
    case tools.blob.tool:
      return new Line(config);
    case tools.comment.tool:
      return new Line(config);
    default:
      return null;
  }
};
