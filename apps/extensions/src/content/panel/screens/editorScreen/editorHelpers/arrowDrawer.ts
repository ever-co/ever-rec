import { Layer } from 'konva/lib/Layer';
import { Shape } from 'konva/lib/Shape';
import { Arrow } from 'konva/lib/shapes/Arrow';
import { Line } from 'konva/lib/shapes/Line';
import { Stage } from 'konva/lib/Stage';
import Konva from 'konva/lib/Core';
import { Circle } from 'konva/lib/shapes/Circle';
import { compareTools, ITool, tools } from '../toolsPanel/tools';
import { IArrowGroupOptions } from '../toolsPanel/toolsOptions/interface/IArrowGroupOptions';
import { arrowName, getLayer } from './editorHelper';
import { currentPointerPosition } from './utils';
import { Group } from 'konva/lib/Group';

export interface IArrowDrawer {
  stage: Stage;
  toolsOptions: IArrowGroupOptions;
  activeTool: ITool;
  saveHistory: () => void;
}

export const destroyAnchor = (stage: Stage | null): void => {
  if (stage) {
    const circles = stage?.find('Circle');
    const lines = stage?.find('#quadLinePath');
    if (circles.length !== 0) {
      for (let index = 0; index <= circles.length - 1; index++) {
        circles[index].destroy();
      }
    }
    if (lines.length !== 0) {
      for (let index = 0; index <= lines.length - 1; index++) {
        lines[index].destroy();
      }
    }
  }
};

const updateDottedLines = (
  group: Group,
  toolsOptions: IArrowGroupOptions,
  shape: Shape,
) => {
  const leftCircle = group?.findOne('#resizecircle_left');
  const rightCircle = group?.findOne('#resizecircle_right');
  const centralCircle1 = group?.findOne('#resizecircle_center1');
  const centralCircle2 = group?.findOne('#resizecircle_center2');
  const lines = group.findOne('#quadLinePath');
  if (centralCircle1 && centralCircle2) {
    toolsOptions.points = [
      leftCircle.x(),
      leftCircle.y(),
      centralCircle1.x(),
      centralCircle1.y(),
      centralCircle2.x(),
      centralCircle2.y(),
      rightCircle.x(),
      rightCircle.y(),
    ];
    lines.setAttrs({
      points: [
        leftCircle.x(),
        leftCircle.y(),
        centralCircle1.x(),
        centralCircle1.y(),
        centralCircle2.x(),
        centralCircle2.y(),
        rightCircle.x(),
        rightCircle.y(),
      ],
    });

    shape?.setAttrs({
      points: toolsOptions.points,
      sceneFunc: (ctx: any, shape: any) => {
        ctx.beginPath();
        ctx.moveTo(leftCircle.x(), leftCircle.y());
        ctx.bezierCurveTo(
          centralCircle1.x(),
          centralCircle1.y(),
          centralCircle2.x(),
          centralCircle2.y(),
          rightCircle.x(),
          rightCircle.y(),
        );
        const PI2 = Math.PI * 2;
        const dx = rightCircle.x() - centralCircle2.x();
        const dy = rightCircle.y() - centralCircle2.y();
        const radians = (Math.atan2(dy, dx) + PI2) % PI2;
        const length = shape.getAttr('pointerLength');
        const width = shape.getAttr('pointerWidth');
        ctx.translate(rightCircle.x(), rightCircle.y());
        ctx.rotate(radians);
        ctx.moveTo(0, 0);
        ctx.lineTo(-length, width / 2);
        ctx.moveTo(0, 0);
        ctx.lineTo(-length, -width / 2);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      },
    });
  } else {
    toolsOptions.points1 = [
      leftCircle.x(),
      leftCircle.y(),
      rightCircle.x(),
      rightCircle.y(),
    ];
    shape?.setAttrs({ points: toolsOptions.points1 });
  }

  shape?.cache();
};
const buildLines = (shape: Shape, group: Group) => {
  const quadLinePath = new Line({
    className: 'Lines',
    dash: [7, 7],
    strokeWidth: 1,
    stroke: 'white',
    id: 'quadLinePath',
    listening: false,
    shadowColor: 'rgb(91, 77, 190)',
    shadowBlur: 1,
    shadowOffset: { x: 1, y: 1 },
    points: shape?.attrs.points,
  });
  group?.add(quadLinePath);
  return quadLinePath;
};
const buildAnchor = (
  x: number,
  y: number,
  id: string,
  toolsOptions: IArrowGroupOptions,
  group: Group,
  shape: Shape,
) => {
  const anchor = new Circle({
    id: id,
    className: 'Circles',
    name: 'circle',
    x: x,
    y: y,
    radius: toolsOptions.width > 2 ? toolsOptions.width / 4 + 7 : 8,
    stroke: 'rgb(153, 143, 255)',
    fill: 'rgb(245, 245, 245)',
    strokeWidth: 2,
    draggable: true,
    shadowColor: 'rgb(91, 77, 190)',
    shadowBlur: 1,
    shadowOffset: { x: 1, y: 1 },
  });

  group?.add(anchor);

  // add hover styling
  anchor.on('mouseover', () => {
    document.body.style.cursor = 'pointer';
    anchor.strokeWidth(4);
  });
  anchor.on('mouseout', () => {
    document.body.style.cursor = 'default';
    anchor.strokeWidth(2);
  });

  anchor.on('dragmove', () => {
    updateDottedLines(group, toolsOptions, shape);
  });
  return anchor;
};

export const initArrowDraw = ({
  stage,
  toolsOptions,
  activeTool,
  saveHistory,
}: IArrowDrawer) => {
  stage.on('mousedown', (e) => {
    if (
      e.target.getAttr('name') !== 'circle' &&
      e.target.getAttr('name') !== 'arrow'
    ) {
      arrowDrawMouseDownListener({
        stage,
        toolsOptions,
        activeTool,
        saveHistory,
      });
    }
  });
};

const findCenter = (x: number, y: number) => {
  return (x + y) / 2;
};

const arrowDrawMouseDownListener = ({
  stage,
  toolsOptions,
  activeTool,
  saveHistory,
}: IArrowDrawer) => {
  const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
  const group = new Konva.Group({
    id: 'arrowGroup',
    draggable: true,
  });
  const shapeOptions: any = {
    pointerLength: 20,
    pointerWidth: 20,
    name: arrowName,
    fill: toolsOptions.color,
    stroke: toolsOptions.color,
    pointerAtEnding: true,
    strokeWidth: toolsOptions.width,
    visible: false,
    points: toolsOptions.points,
    strokeScaleEnabled: false,
    lineCap: 'round',
    pixelRatio: 1,
  };

  if (compareTools(activeTool, tools.line)) {
    const pos = stage.getRelativePointerPosition();
    shapeOptions.points = [pos.x, pos.y, pos.x, pos.y];
    shapeOptions.tension = 30;
    shapeOptions.shapeType = 'line';
  }

  if (compareTools(activeTool, tools.arrow)) {
    const pos = stage.getRelativePointerPosition();
    shapeOptions.points = [pos.x, pos.y, pos.x, pos.y];
    shapeOptions.tension = 30;
    shapeOptions.shapeType = 'arrow';
  }

  if (compareTools(activeTool, tools.curvaArrow)) {
    const pos = stage.getRelativePointerPosition();
    shapeOptions.points = [pos.x, pos.y, pos.x, pos.y];
    shapeOptions.shapeType = 'curvaArrow';
    shapeOptions.fillEnabled = false;
    shapeOptions.lineJoin = 'round';
    shapeOptions.height = 50;
  }

  if (compareTools(activeTool, tools.direction)) {
    const pos = stage.getRelativePointerPosition();
    shapeOptions.points = [pos.x, pos.y, pos.x, pos.y];
    shapeOptions.shapeType = 'direction';
    shapeOptions.pointerLength = 50;
    shapeOptions.pointerWidth = 50;
  }

  const shape: Shape | null = getShapeByTool(activeTool, shapeOptions);
  if (shape) {
    group?.add(shape);

    shape.on('mousedown', () => {
      destroyAnchor(stage);
      if (shape.attrs.shapeType !== 'curvaArrow') {
        buildAnchor(
          shape.attrs.points[0],
          shape.attrs.points[1],
          'resizecircle_left',
          toolsOptions,
          group,
          shape,
        );
        buildAnchor(
          shape.attrs.points[2],
          shape.attrs.points[3],
          'resizecircle_right',
          toolsOptions,
          group,
          shape,
        );
      } else {
        buildLines(shape, group);
        if (shape.attrs.points.length > 4) {
          buildAnchor(
            shape.attrs.points[0],
            shape.attrs.points[1],
            'resizecircle_left',
            toolsOptions,
            group,
            shape,
          );
          buildAnchor(
            shape.attrs.points[2],
            shape.attrs.points[3],
            'resizecircle_center1',
            toolsOptions,
            group,
            shape,
          );
          buildAnchor(
            shape.attrs.points[4],
            shape.attrs.points[5],
            'resizecircle_center2',
            toolsOptions,
            group,
            shape,
          );

          buildAnchor(
            shape.attrs.points[6],
            shape.attrs.points[7],
            'resizecircle_right',
            toolsOptions,
            group,
            shape,
          );
        } else {
          buildAnchor(
            shape.attrs.points[0],
            shape.attrs.points[1],
            'resizecircle_left',
            toolsOptions,
            group,
            shape,
          );

          buildAnchor(
            findCenter(shape.attrs.points[0], shape.attrs.points[2]),
            findCenter(shape.attrs.points[1], shape.attrs.points[3]),
            'resizecircle_center1',
            toolsOptions,
            group,
            shape,
          );

          buildAnchor(
            findCenter(shape.attrs.points[0], shape.attrs.points[2]),
            findCenter(shape.attrs.points[1], shape.attrs.points[3]),
            'resizecircle_center2',
            toolsOptions,
            group,
            shape,
          );
          buildAnchor(
            shape.attrs.points[2],
            shape.attrs.points[3],
            'resizecircle_right',
            toolsOptions,
            group,
            shape,
          );
        }
      }
    });

    stage.on('click', (e) => {
      if (e.target.attrs.name !== 'arrow') {
        destroyAnchor(stage);
      }
    });

    stage.on('mousemove', () => {
      destroyAnchor(stage);
      arrowDrawMouseMoveListener(stage, shape, drawLayer as Layer);
    });

    stage?.on('mouseup', () => {
      buildAnchor(
        shape.attrs.points[0],
        shape.attrs.points[1],
        'resizecircle_left',
        toolsOptions,
        group,
        shape,
      );

      if (activeTool.tool === 'curvaArrow') {
        buildLines(shape, group);
        buildAnchor(
          findCenter(shape.attrs.points[0], shape.attrs.points[2]),
          findCenter(shape.attrs.points[1], shape.attrs.points[3]),
          'resizecircle_center2',
          toolsOptions,
          group,
          shape,
        );
        buildAnchor(
          findCenter(shape.attrs.points[0], shape.attrs.points[2]),
          findCenter(shape.attrs.points[1], shape.attrs.points[3]),
          'resizecircle_center1',
          toolsOptions,
          group,
          shape,
        );
      }

      buildAnchor(
        shape.attrs.points[2],
        shape.attrs.points[3],
        'resizecircle_right',
        toolsOptions,
        group,
        shape,
      );
      arrowDrawMouseUpListener(stage, shape, saveHistory);
    });
  }

  drawLayer?.add(group);

  const arrowDrawMouseUpListener = (
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
      destroyAnchor(stage);
    } else {
      saveHistory();
    }
  };

  const arrowDrawMouseMoveListener = (
    stage: Stage,
    shape: Shape,
    layer: Layer,
  ) => {
    shape.show();
    const pos = stage.getRelativePointerPosition();
    if (shape instanceof Line || shape instanceof Arrow) {
      const newPoints = shape.points();
      newPoints[2] = pos.x;
      newPoints[3] = pos.y;
      shape.points(newPoints);
    }
  };
};

export const initEventListenersArrow = (
  stage: Stage,
  shape: Shape,
  toolsOptions: IArrowGroupOptions,
  group: Group,
  activeTool: ITool,
) => {
  shape?.on('mousedown', () => {
    destroyAnchor(stage);
    if (shape && shape.attrs.shapeType !== 'curvaArrow') {
      buildAnchor(
        shape.attrs.points[0],
        shape.attrs.points[1],
        'resizecircle_left',
        toolsOptions,
        group,
        shape,
      );
      buildAnchor(
        shape.attrs.points[2],
        shape.attrs.points[3],
        'resizecircle_right',
        toolsOptions,
        group,
        shape,
      );
    } else {
      buildLines(shape, group);
      if (shape.attrs.points.length > 4) {
        buildAnchor(
          shape.attrs.points[0],
          shape.attrs.points[1],
          'resizecircle_left',
          toolsOptions,
          group,
          shape,
        );
        buildAnchor(
          shape.attrs.points[2],
          shape.attrs.points[3],
          'resizecircle_center1',
          toolsOptions,
          group,
          shape,
        );
        buildAnchor(
          shape.attrs.points[4],
          shape.attrs.points[5],
          'resizecircle_center2',
          toolsOptions,
          group,
          shape,
        );

        buildAnchor(
          shape.attrs.points[6],
          shape.attrs.points[7],
          'resizecircle_right',
          toolsOptions,
          group,
          shape,
        );
      } else {
        buildAnchor(
          shape.attrs.points[0],
          shape.attrs.points[1],
          'resizecircle_left',
          toolsOptions,
          group,
          shape,
        );

        buildAnchor(
          findCenter(shape.attrs.points[0], shape.attrs.points[2]),
          findCenter(shape.attrs.points[1], shape.attrs.points[3]),
          'resizecircle_center1',
          toolsOptions,
          group,
          shape,
        );

        buildAnchor(
          findCenter(shape.attrs.points[0], shape.attrs.points[2]),
          findCenter(shape.attrs.points[1], shape.attrs.points[3]),
          'resizecircle_center2',
          toolsOptions,
          group,
          shape,
        );
        buildAnchor(
          shape.attrs.points[2],
          shape.attrs.points[3],
          'resizecircle_right',
          toolsOptions,
          group,
          shape,
        );
      }
    }
  });

  stage.on('click', (e) => {
    if (e.target.attrs.name !== 'arrow') {
      destroyAnchor(stage);
    }
  });

  stage.on('mousemove', () => {
    destroyAnchor(stage);
  });

  stage?.on('mouseup', () => {
    buildAnchor(
      shape.attrs.points[0],
      shape.attrs.points[1],
      'resizecircle_left',
      toolsOptions,
      group,
      shape,
    );

    if (activeTool.tool === 'curvaArrow') {
      buildLines(shape, group);
      buildAnchor(
        findCenter(shape.attrs.points[0], shape.attrs.points[2]),
        findCenter(shape.attrs.points[1], shape.attrs.points[3]),
        'resizecircle_center2',
        toolsOptions,
        group,
        shape,
      );
      buildAnchor(
        findCenter(shape.attrs.points[0], shape.attrs.points[2]),
        findCenter(shape.attrs.points[1], shape.attrs.points[3]),
        'resizecircle_center1',
        toolsOptions,
        group,
        shape,
      );
    }

    buildAnchor(
      shape.attrs.points[2],
      shape.attrs.points[3],
      'resizecircle_right',
      toolsOptions,
      group,
      shape,
    );
  });
};

const getShapeByTool = (activeTool: ITool, config: any): Shape | null => {
  switch (activeTool.tool) {
    case tools.arrow.tool:
      return new Arrow(config);
    case tools.line.tool:
      return new Line(config);
    case tools.curvaArrow.tool:
      return new Arrow(config);
    case tools.direction.tool:
      return new Arrow(config);
    default:
      return null;
  }
};
