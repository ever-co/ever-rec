import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { Path } from 'konva/lib/shapes/Path';
import { Group } from 'konva/lib/Group';
import { getLayer } from 'components/pagesComponents/_editorScreen/editorHelpers/editorHelper';
import { Line } from 'konva/lib/shapes/Line';

export interface ICommentDrawer {
  stage: Stage;
  options: ICommentOptions;
  shapeType: string;
  saveHistory: () => void;
  userImg;
}

export interface ICommentOptions {
  id: string;
  type?: string;
  position: { x: number; y: number };
}

export const initCommentDraw = ({
  stage,
  options,
  shapeType,
  saveHistory,
  userImg,
}: ICommentDrawer) => {
  stage.on('mousedown', (e) => {
    if (e.target.getAttr('shapeType') !== 'comments') {
      drawCommentListener({
        stage,
        options,
        shapeType,
        saveHistory,
        userImg,
      });
    }
  });
};

export const baseCommentOptions: any = {
  points: [0, 0, 80, 0, 80, 60, 12, 60, 0, 80],
  closed: true,
  tension: 0.025,
  fillPatternImage: null,
  scale: {
    x: 0.5,
    y: 0.5,
  },
  fillPatternScale: {
    x: 0.09,
    y: 0.06,
  },
  fillPatternRepeat: 'no-repeat',
  stroke: '#1C1C1E',
  strokeWidth: 3,
};

const drawCommentListener = ({
  stage,
  options,
  shapeType,
  saveHistory,
  userImg,
}: ICommentDrawer) => {
  const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');

  const group = new Konva.Group({
    id: 'commentGroup',
    draggable: true,
  });

  const image = new Image(20, 20);
  image.src = userImg;

  const userBubble = new Line(baseCommentOptions);
  userBubble.setAttrs({
    shapeType: shapeType,
    x: stage.getRelativePointerPosition()?.x,
    y: stage.getRelativePointerPosition()?.y,
    fillPatternImage: image,
  });

  group.add(userBubble);
  drawLayer?.add(group);

  if (drawLayer) {
    stage.on('mouseup', () => drawImageMouseUpListener(stage, saveHistory));
    initEventListenersComment(stage, userBubble, group, options, userImg);
  }
};

export const initEventListenersComment = (
  stage: Stage,
  userBubble,
  group: Group,
  options: ICommentOptions,
  userImg,
) => {
  userBubble?.on('click', () => {
    setPosition(stage, userBubble);
  });

  userBubble?.on('mouseover', () => {
    userBubble.setAttrs({
      shadowColor: 'black',
      shadowBlur: 6,
      shadowOpacity: 1,
    });
  });

  userBubble?.on('mouseout', () => {
    userBubble.setAttrs({
      shadowOpacity: userBubble.getAttr('shadowOpacity') === 1 ? 0 : 1,
    });
  });

  group?.on('dragmove', () => {
    setPosition(stage, userBubble);
  });

  group?.on('dragstart', () => {
    stage.container().style.cursor = 'move';
  });
  group?.on('dragend', () => {
    stage.container().style.cursor = 'default';
  });
  group?.on('click', () => {
    stage.container().style.cursor = 'default';
    setPosition(stage, userBubble);
  });
};

const drawImageMouseUpListener = (stage: Stage, saveHistory: () => void) => {
  stage?.off('mousemove');
  stage?.off('mouseup');
  saveHistory();
};

export const setPosition = (stage: Stage, tr: Line) => {
  const commentPopup = document.getElementById('whiteboard-comment');
  const trHeight = commentPopup?.offsetHeight;
  const trWidth = commentPopup?.offsetWidth;
  const x = tr?.getAbsolutePosition()?.x;
  const y = tr?.getAbsolutePosition()?.y;
  commentPopup?.style.setProperty('display', 'block');
  if (tr && stage && trWidth && trHeight && x && y) {
    commentPopup?.style.setProperty('left', x + 90 + 'px');
    commentPopup?.style.setProperty('top', y + 70 + 'px');
  }
};
