import { imageFromUrl } from '@/app/utilities/images';
import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Rect } from 'konva/lib/shapes/Rect';
import { Box } from 'konva/lib/shapes/Transformer';
import { Stage } from 'konva/lib/Stage';
import { Vector2d } from 'konva/lib/types';
import { getLayer } from './editorHelper';

export const currentPointerPosition = (stage: Stage): Vector2d => {
  const pos = {
    x: 0,
    y: 0,
  };

  //! I might be breaking stuff here, but TypeScript cries for possible undefined value
  const scale = stage.scale();
  const scaleX: any = scale?.x;
  const scaleY: any = scale?.y;

  const pointerPos = stage.getPointerPosition();
  if (pointerPos) {
    pos.x = pointerPos.x / scaleX - stage.position().x / scaleX;
    pos.y = pointerPos.y / scaleY - stage.position().y / scaleY;
  }
  return pos;
};

export const getBlobFromStage = async (
  stage: Stage,
  dimentions: { width: number; height: number },
  scale: number,
): Promise<Blob> => {
  // const newStage: Stage = await cloneStage(stage);
  // newStage.width(dimentions.width);
  // newStage.height(dimentions.height);
  // newStage.scale({
  //   x: 100 / scale,
  //   y: 100 / scale,
  // });

  // const imgObj = await imageFromUrl(newStage.toDataURL());
  // const canvas = document.createElement('canvas');
  // canvas.width = imgObj.width;
  // canvas.height = imgObj.height;
  // canvas.getContext('2d')?.drawImage(imgObj, 0, 0);

  // return new Promise((resolve, reject) => {
  //   canvas.toBlob(blob => {
  //   blob ? resolve(blob) : reject('Can\'t create blob');
  //   });
  // });

  // const width = stage.width();
  // const height = stage.height();
  // const stageScale = stage.scale();

  // stage.width(dimentions.width);
  // stage.height(dimentions.height);
  // stage.scale({
  //   x: 1,
  //   y: 1,
  // });

  const cloned_stage = stage.clone();
  const whiteBg = cloned_stage.findOne('#stageBackground');
  whiteBg.destroy();
  cloned_stage.width(dimentions.width);
  cloned_stage.height(dimentions.height);
  cloned_stage.scale({
    x: 1,
    y: 1,
  });
  // @ts-ignore
  cloned_stage.find('#blurred').forEach((element: Rect) => {
    element.cache();
  });
  const imgObj = await imageFromUrl(cloned_stage.toDataURL());
  const canvas = document.createElement('canvas');
  canvas.width = imgObj.width;
  canvas.height = imgObj.height;
  canvas.getContext('2d')?.drawImage(imgObj, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      blob ? resolve(blob) : reject("Can't create blob");
    });
  });
};

export const cloneStage = async (stage: Stage): Promise<Stage> => {
  const img = stage?.findOne('#main').toDataURL({
    pixelRatio: 1,
  });
  const stageObj = stage.toObject();
  const container = document.createElement('div');
  const newStage: Stage = Konva.Node.create(stageObj, container);
  const imageObj = await imageFromUrl(img);
  (newStage?.findOne('#main') as Konva.Image).image(imageObj);

  const imgNodes: Konva.Image[] = [];
  newStage.find('Image').forEach((imageNode: any) => {
    imgNodes.push(imageNode);
  });

  await Promise.allSettled(
    imgNodes.map(async (node: Konva.Image) => {
      const src = node.getAttr('src');
      if (src) {
        const imageObj = await imageFromUrl(src);
        node.image(imageObj);
        node.getLayer()?.batchDraw();
      }
    }),
  );

  container.remove();
  return newStage;
};

export const getTotalBox = (boxes: any) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  boxes.forEach((box: any) => {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  });
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const transformLimitation = (
  oldBoundBox: Box,
  newBoundBox: Box,
  stage: Stage,
) => {
  if (Math.abs(newBoundBox.width) < 20) {
    return oldBoundBox;
  }

  if (Math.abs(newBoundBox.height) < 20) {
    return oldBoundBox;
  }

  if (
    Math.abs(newBoundBox.width + newBoundBox.x) > stage.width() - 2 ||
    Math.abs(newBoundBox.height + newBoundBox.y) > stage.height() - 2 ||
    newBoundBox.x <= 2 ||
    newBoundBox.y <= 2
  ) {
    return oldBoundBox;
  }

  return newBoundBox;
};

/* export const getBlobFromStage = async (
  stage: Stage,
  dimentions: { width: number; height: number },
  scale: number,
  mainScale: number,
): Promise<Blob> => {
  const { width, height } = dimentions;
  const scaleCoefficient = scale / 100;

  const layer: Layer | undefined = getLayer(stage, '#drawLayer');
  let rect: Rect;
  if (stage) {
    layer?.getChildren().forEach(async (figure: any) => {
      if (figure.attrs.id == 'main') {
        rect = figure;
      } else if (figure.attrs) {
        const item: Konva.Image = figure;

        const newX = item.x() / item.scaleX();
        const newY = item.y() / item.scaleY();

        //item.position({
        // x: newX,
        // y: newY,
        //});
        if (scaleCoefficient != 1) {
          item.scaleX(mainScale);
          item.scaleY(mainScale);
        } // else {
        // item.scaleX(scaleCoefficient);
        //item.scaleY(scaleCoefficient);
        //}
      }
    });
  }
  if (scaleCoefficient != 1) {
    rect.width(width * mainScale);
    rect.height(height * mainScale);
  } else {
    rect.width(width);
    rect.height(height);
  }
  const newWidth = rect.width();
  const newHeight = rect.height();
  const scaleX = newWidth / width;
  const scaleY = newHeight / height;
  //const scaleMain = Math.max(scaleX, scaleY);
  if (scaleCoefficient != 1) {
    rect.fillPatternScaleX(scaleX);
    rect.fillPatternScaleY(scaleY);
  }

  stage.height(rect.attrs.height);
  stage.width(rect.attrs.width);

  const imgObj = await imageFromUrl(stage.toDataURL());
  const canvas = document.createElement('canvas');
  canvas.width = imgObj.width;
  canvas.height = imgObj.height;
  canvas.getContext('2d')?.drawImage(imgObj, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      blob ? resolve(blob) : reject("Can't create blob");
    });
  });
}; */
