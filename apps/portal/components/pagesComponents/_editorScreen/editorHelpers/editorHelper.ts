import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';

export const drawnName = 'drawn';
export const arrowName = 'arrow';
export const markerName = 'marker';
export const commentsName = 'comments';
export const blurName = 'blur';

export const getLayer = (
  stage: Stage | null,
  selector:
    | '#mainLayer'
    | '#drawLayer'
    | '#cropperLayer'
    | '#markersLayer'
    | '#commentsLayer'
    | '#blurLayer'
    | '#backLayer',
): Layer | undefined => {
  const layer: Layer | undefined = stage?.findOne(selector);
  return layer;
};
