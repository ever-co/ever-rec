import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { drawnName, getLayer } from './editorHelper';
import { Canvg, presets } from 'canvg';

export interface IImageDrawerOptions {
  shapeType: string;
  imageName: string;
  fullpath: string;
  proportional?: boolean;
}

export interface IImageDrawer {
  stage: Stage;
  options: IImageDrawerOptions;
  saveHistory: () => void;
  stageScale: number;
}

const preset = presets.offscreen();
export const toPng = async (data) => {
  const { width, height, svg } = data;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const v = await Canvg.from(ctx as any, svg, preset as any);
  // Render only first frame, ignoring animations and mouse.
  await v.render();
  const pngUrl = canvas.toDataURL();
  return pngUrl;
};
export const initImageDraw = ({
  stage,
  options,
  saveHistory,
  stageScale,
}: IImageDrawer) => {
  stage.on('mousedown', (e) => {
    if (e.target.getAttr('shapeType') !== 'emoji') {
      drawImageMouseDownListener({
        stage,
        options,
        saveHistory,
        stageScale,
      });
    }
  });
};

const drawImageMouseDownListener = ({
  stage,
  options,
  saveHistory,
  stageScale,
}: IImageDrawer) => {
  const scaleCoefficient = stageScale / 100;
  toPng({
    width: 600,
    height: 600,
    svg: options.fullpath,
  })
    .then((pngUrl) => {
      const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
      drawLayer &&
        Konva.Image.fromURL(pngUrl, (imageNode: Konva.Image) => {
          drawLayer.add(imageNode);
          imageNode.setAttrs({
            shapeType: options.shapeType,
            imageName: options.imageName,
            srcPath: pngUrl,
            name: drawnName,
            x: (stage?.getRelativePointerPosition()?.x || 0) - 42,
            y: (stage?.getRelativePointerPosition()?.y || 0) - 42,
            scaleX: scaleCoefficient,
            scaleY: scaleCoefficient,
            width: 164,
            height: 164,
            draggable: true,
            pixelRatio: 1,
          });
          stage?.on('mouseup', () =>
            drawImageMouseUpListener(stage, saveHistory),
          );
        });
    })
    .catch((err) => {
      console.log(err);
    });
  stage?.on('mouseup', () => drawImageMouseUpListener(stage, saveHistory));
};

//Drawing on mouse down

// const drawImageMouseMoveListener = (
//   stage: Stage,
//   image: Konva.Image,
//   { proportional }: IImageDrawerOptions,
// ) => {
//   const x = stage.getRelativePointerPosition().x;
//   const y = stage.getRelativePointerPosition().y;
//   const width = x - image.x();
//   const height = !proportional ? y - image.y() : width;
//   image.width(width);
//   image.height(height);
// };

const drawImageMouseUpListener = (stage: Stage, saveHistory: () => void) => {
  stage?.off('mousemove');
  stage?.off('mouseup');
  saveHistory();
};
