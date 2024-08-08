import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { commentsName, getLayer } from './editorHelper';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';
import { Path } from 'konva/lib/shapes/Path';
import { Text } from 'konva/lib/shapes/Text';
import { group } from 'console';

export interface ICommentsDrawer {
  stage: Stage;
  options: ICommentsOptions;
  shapeType: string;
  saveHistory: () => void;
}

export const initCommentsDraw = ({
  stage,
  options,
  shapeType,
  saveHistory,
}: ICommentsDrawer) => {
  stage.on('mousedown', (e) => {
    if (e.target.getAttr('shapeType') !== 'comments') {
      drawCommentsListener({
        stage,
        options,
        shapeType,
        saveHistory,
      });
    }
  });
};

const drawCommentsListener = ({
  stage,
  options,
  shapeType,
  saveHistory,
}: ICommentsDrawer) => {
  const drawOptions: any = {
    shapeType: shapeType,
    data: 'M0.5 15C0.5 12.1881 0.502422 10.8552 0.720969 9.75646C1.6284 5.19452 5.19452 1.6284 9.75646 0.720969C10.8552 0.502422 12.1881 0.5 15 0.5C17.8119 0.5 19.1448 0.502422 20.2435 0.720969C24.8055 1.6284 28.3716 5.19452 29.279 9.75646C29.4976 10.8552 29.5 12.1881 29.5 15C29.5 17.8119 29.4976 19.1448 29.279 20.2435C28.3716 24.8055 24.8055 28.3716 20.2435 29.279C19.1448 29.4976 17.8119 29.5 15 29.5H0.5V15Z',
    x: stage.getRelativePointerPosition().x - 10,
    y: stage.getRelativePointerPosition().y - 10,
    // fill: options.fill,
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 50, y: 50 },
    fillLinearGradientColorStops: [
      0,
      'rgb(255,255,255)',
      1,
      'rgb(210,210,210)',
    ],
    stroke: 'rgba(91,77,240,0.2)',
    strokeWidth: 2,
    scale: {
      x: 2,
      y: 2,
    },
    pixelRatio: 1,
    name: commentsName,
  };

  const text: Text = new Text({
    id: 'commentText',
    x: stage.getRelativePointerPosition().x - 30,
    y: stage.getRelativePointerPosition().y - 25,
    
    fontSize: 54,
    text: options.text,
    fill:"#5b4dbe",
    height: 100,
    width: 100,
    padding: 20,
    align: 'center',
    verticalAlign: 'middle',
    listening: false,
    rotation: 0,
    shadowColor: 'black',
    shadowBlur: 2,
    shadowOpacity: 0.5,
    shadowOffset: { x: 1, y: 1 },
  
  });

  const commentsLayer: Layer | undefined = getLayer(stage, '#commentsLayer');
  const group = new Konva.Group({
    id: 'commentsGroup',
    draggable: true,
  });

  const comment = new Path(drawOptions);
  group.add(comment);
  group.add(text)

  if (commentsLayer) {
    stage.on('mouseup', () => drawCommentsMouseUpListener(stage, saveHistory));
    initEventListenersComments(stage, comment);
    commentsLayer.add(group);
  }
};

export const initEventListenersComments = (stage: Stage, comment: Path) => {


  comment.on('mouseover', () => {
    comment.setAttrs({
      shadowColor: 'black',
      shadowBlur: 6,
      // shadowOffset: { x: 0, y: 0 },
      shadowOpacity: 0.5,
    });
    stage.container().style.cursor = 'pointer';
  });



  comment.on('click', () => {
    comment.setAttrs({
      shadowOpacity: 0.6,
    });
  });
  comment.on('mousedown', () => {
    stage.container().style.cursor = 'move';
 
  });
  comment.on('mouseup', () => {
    stage.container().style.cursor = 'pointer';
   
  });

  comment.on('mouseout', () => {
    comment.setAttrs({
      shadowOpacity: comment.getAttr('shadowOpacity') === 0.6 ? 0.6 : 0,
    });
    stage.container().style.cursor = 'default';
  });
};

const drawCommentsMouseUpListener = (stage: Stage, saveHistory: () => void) => {
  stage?.off('mousemove');
  stage?.off('mouseup');
  saveHistory();
};
