import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Rect } from 'konva/lib/shapes/Rect';
import { updateTransformer } from './transformerHelper';
import { getTotalBox, transformLimitation } from './utils';
import { initPointerTransformer } from './transformerHelper';
import { Stage } from 'konva/lib/Stage';

export interface ICropDrawer {
  stage: Stage;
  setCropperAreaState: (state: boolean) => void;
}

export const initCrop = ({ stage, setCropperAreaState }: ICropDrawer) => {
  stage.on('mousedown', () =>
    cropMouseDownListener({
      stage,
      setCropperAreaState,
    }),
  );
};

const cropMouseDownListener = ({ stage, setCropperAreaState }: ICropDrawer) => {
  const cropperLayer: Layer = new Konva.Layer({ id: 'cropperLayer' });
  const rect: Rect = new Konva.Rect({
    x: stage.getRelativePointerPosition().x,
    y: stage.getRelativePointerPosition().y,
    width: 20,
    height: 20,
    draggable: true,
  });
  const tr = new Konva.Transformer({
    id: 'cropperTransformer',
    rotateEnabled: false,
    padding: 2,
    anchorStroke: 'rgb(91, 77, 190)',
    borderStroke: 'rgb(91, 77, 190)',
    borderDash: [3, 3],
    anchorStrokeWidth: 1,
    borderStrokeWidth: 1,
    anchorSize: 10,
    pixelRatio: 1,
    keepRatio: false,

    boundBoxFunc: (oldBoundBox, newBoundBox) =>
      transformLimitation(oldBoundBox, newBoundBox, stage),
  });

  tr.on('dragmove', () => {
    const boxes = tr.nodes().map((node) => node.getClientRect());
    const box = getTotalBox(boxes);
    tr.nodes().forEach((shape) => {
      const absPos = shape.getAbsolutePosition();
      const offsetX = box.x - absPos.x;
      const offsetY = box.y - absPos.y;
      const newAbsPos = { ...absPos };
      if (box.x < 0) {
        newAbsPos.x = -offsetX;
      }
      if (box.y < 0) {
        newAbsPos.y = -offsetY;
      }
      if (box.x + box.width > stage.width()) {
        newAbsPos.x = stage.width() - box.width - offsetX;
      }
      if (box.y + box.height > stage.height()) {
        newAbsPos.y = stage.height() - box.height - offsetY;
      }
      shape.setAbsolutePosition(newAbsPos);
    });
  });

  if (!stage.findOne('#cropperLayer')) {
    tr.nodes([rect]);
    updateTransformer(tr);
    cropperLayer.add(rect);
    cropperLayer.add(tr);
    stage.add(cropperLayer);
  }
  const setPositionCropBar = () => {
    const stageHeight: number = stage.height();
    const trHeight: number = tr.height() + 96;
    const mainPositionHeight: number = tr.getAbsolutePosition().y;
    const resultHeight: number = stageHeight - (trHeight + mainPositionHeight);

    const stageWith: number = stage.width();
    const trWidth: number = tr.width() + 112;
    const mainPositionWidth: number = tr.getAbsolutePosition().x;
    const resultWidth: number = stageWith - (trWidth + mainPositionWidth);

    if (tr.getAbsolutePosition().x + tr.getWidth() < 1800) {
      const cropper = document.getElementById('cropper1');

      if (
        resultWidth < 0 ||
        window.innerWidth <= trWidth + mainPositionWidth + 40
      ) {
        if (tr.absolutePosition().x - 112 <= 0) {
          if (
            Math.round(resultHeight) < 0 ||
            window.innerHeight <= trHeight + mainPositionHeight + 10
          ) {
            if (tr.getAbsolutePosition().y < 80) {
              cropper?.style.setProperty(
                'left',
                tr.getAbsolutePosition().x + 'px',
              );
              cropper?.style.setProperty(
                'top',
                tr.getAbsolutePosition().y + tr.height() - 80 + 'px',
              );
            } else {
              cropper?.style.setProperty(
                'left',
                tr.getAbsolutePosition().x + (tr.width() - 112) + 'px',
              );
              cropper?.style.setProperty(
                'top',
                tr.getAbsolutePosition().y - 80 + 'px',
              );
            }
          } else {
            cropper?.style.setProperty(
              'left',
              tr.getAbsolutePosition().x + 'px',
            );
            cropper?.style.setProperty(
              'top',
              tr.getAbsolutePosition().y + tr.getHeight() + 10 + 'px',
            );
          }
        } else {
          cropper?.style.setProperty(
            'left',
            tr.getAbsolutePosition().x - 120 + 'px',
          );
          cropper?.style.setProperty(
            'top',
            tr.getAbsolutePosition().y + tr.getHeight() - 80 + 'px',
          );
        }
      } else if (tr.width() + 112 > stage.width()) {
        cropper?.style.setProperty(
          'left',
          tr.getAbsolutePosition().x - 120 + 'px',
        );
        cropper?.style.setProperty(
          'top',
          tr.getAbsolutePosition().y + tr.getHeight() - 20 + 'px',
        );
      } else {
        cropper?.style.setProperty(
          'left',
          tr.getAbsolutePosition().x + tr.getWidth() + 10 + 'px',
        );
        cropper?.style.setProperty(
          'top',
          tr.getAbsolutePosition().y + tr.getHeight() - 80 + 'px',
        );
      }
    }
    if (tr.getAbsolutePosition().x + tr.getWidth() > 1800) {
      const cropper = document.getElementById('cropper1');
      if (tr.getAbsolutePosition().x - 112 < 0) {
        if (resultHeight + 10 < 0) {
          if (tr.absolutePosition().y - 112 < 0) {
            cropper?.style.setProperty(
              'left',
              tr.getAbsolutePosition().x + 'px',
            );
            cropper?.style.setProperty(
              'top',
              tr.getAbsolutePosition().y + tr.height() - 80 + 'px',
            );
          } else {
            cropper?.style.setProperty(
              'left',
              tr.getAbsolutePosition().x + (tr.width() - 112) + 'px',
            );
            cropper?.style.setProperty(
              'top',
              tr.getAbsolutePosition().y - 80 + 'px',
            );
          }
        } else {
          cropper?.style.setProperty('left', tr.getAbsolutePosition().x + 'px');
          cropper?.style.setProperty(
            'top',
            tr.getAbsolutePosition().y + tr.getHeight() + 'px',
          );
        }
      } else {
        cropper?.style.setProperty(
          'left',
          tr.getAbsolutePosition().x - 120 + 'px',
        );
        cropper?.style.setProperty(
          'top',
          tr.getAbsolutePosition().y + tr.getHeight() - 80 + 'px',
        );
      }
    }
    if (
      tr.getAbsolutePosition().x + tr.getWidth() > 1800 &&
      tr.getAbsolutePosition().y + tr.getHeight() > 800
    ) {
      const cropper = document.getElementById('cropper1');
      if (tr.getAbsolutePosition().x - 112 < 0) {
        if (resultHeight + 10 < 0) {
          if (tr.absolutePosition().y - 112 < 0) {
            cropper?.style.setProperty(
              'left',
              tr.getAbsolutePosition().x + 'px',
            );
            cropper?.style.setProperty(
              'top',
              tr.getAbsolutePosition().y + tr.height() - 80 + 'px',
            );
          } else {
            cropper?.style.setProperty(
              'left',
              tr.getAbsolutePosition().x + (tr.width() - 112) + 'px',
            );
            cropper?.style.setProperty(
              'top',
              tr.getAbsolutePosition().y - 85 + 'px',
            );
          }
        } else {
          cropper?.style.setProperty('left', tr.getAbsolutePosition().x + 'px');
          cropper?.style.setProperty(
            'top',
            tr.getAbsolutePosition().y + tr.getHeight() + 'px',
          );
        }
      } else {
        cropper?.style.setProperty(
          'left',
          tr.getAbsolutePosition().x - 120 + 'px',
        );
        cropper?.style.setProperty('top', tr.getAbsolutePosition().y + 'px');
      }
    }

    if (
      tr.getAbsolutePosition().x + tr.getWidth() < 1800 &&
      tr.getAbsolutePosition().y + tr.getHeight() > 800
    ) {
      const cropper = document.getElementById('cropper1');

      if (tr.getAbsolutePosition().x - 112 <= 0) {
        cropper?.style.setProperty(
          'left',
          tr.getAbsolutePosition().x + tr.getWidth() + 10 + 'px',
        );
        cropper?.style.setProperty('top', tr.getAbsolutePosition().y + 'px');
      } else {
        cropper?.style.setProperty(
          'left',
          tr.getAbsolutePosition().x - 112 + 'px',
        );
        cropper?.style.setProperty('top', tr.getAbsolutePosition().y + 'px');
      }
    }
  };

  tr.on('mouseover mouseleave mouseup', () => {
    setPositionCropBar();
  });

  rect.on('mouseup mousemove click', () => {
    setPositionCropBar();
  });

  stage.on('mousemove', () => cropMouseMoveListener(stage, rect));
  stage?.on('mouseup', () => {
    cropMouseUpListener(stage, rect, setCropperAreaState);
    setPositionCropBar();
  });
};

const cropMouseMoveListener = (stage: Stage, rect: Rect) => {
  rect.width(stage.getRelativePointerPosition().x - rect.x());
  rect.height(stage.getRelativePointerPosition().y - rect.y());
};

const cropMouseUpListener = (
  stage: Stage,
  rect: Rect,
  cropperAreaState: (state: boolean) => void,
) => {
  cropperAreaState(!!rect.width() && !!rect.height());
  stage?.off('mousedown');
  stage?.off('mousemove');
  stage?.off('mouseup');
};
