import Konva from 'konva';
import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';
import { Text } from 'konva/lib/shapes/Text';
import { drawnName, getLayer } from './editorHelper';
import { Group } from 'konva/lib/Group';
import { IConversationOptions } from 'app/interfaces/tools_interfaces/IConversationOptions';
import { Path } from 'konva/lib/shapes/Path';
import { Shape } from 'konva/lib/Shape';

export interface IConversationDrawerOptions {
  shapeType: string;
  imageName: string;
  fullpath: string;
  proportional?: boolean;
}

export interface IConversationDrawer {
  stage: Stage;
  options: IConversationDrawerOptions;
  styleOptions: IConversationOptions;
  saveHistory: () => void;
}

export const initConversationDraw = ({
  stage,
  options,
  styleOptions,
  saveHistory,
}: IConversationDrawer) => {
  stage.on('mousedown', (e) => {
    if (e.target.parent?.getAttr('id') !== 'conversationGroup') {
      drawImageMouseDownListener({
        stage,
        options,
        styleOptions,
        saveHistory,
      });
    }
  });
};

const drawImageMouseDownListener = ({
  stage,
  options,
  styleOptions,
  saveHistory,
}: IConversationDrawer) => {
  const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
  const group = new Konva.Group({
    id: 'conversationGroup',
    draggable: true,
  });

  // const tr = new Konva.Transformer({
  //   id: 'pointerTransformer',
  //   rotateEnabled: false,
  //   padding: 12,
  //   width: 2,
  //   height: 2,
  //   anchorStroke: 'rgb(91, 77, 190)',
  //   borderStroke: 'rgb(91, 77, 190)',
  //   borderDash: [5, 5],
  //   anchorStrokeWidth: 2,
  //   borderStrokeWidth: 2,
  //   anchorSize: 10,
  // });

  const shape = new Konva.Path({
    shapeType: options.shapeType,
    name: drawnName,
    x: (stage?.getRelativePointerPosition()?.x || 0) - 62,
    y: (stage?.getRelativePointerPosition()?.y || 0) - 62,
    width: 64,
    height: 64,
    scale: {
      x: 4,
      y: 4,
    },
    fill: styleOptions.fillColor,
    stroke: styleOptions.strokeColor,
    strokeWidth: styleOptions.strokeWidth,
    id: styleOptions.category + '/' + styleOptions.filename,
    draggable: true,
    strokeScaleEnabled: false,
    data: styleOptions.data,
    dash: styleOptions.dash,
    visible: true,
    pixelRatio: 1,
  });

  group.add(shape);

  const complexText: Text = new Text({
    x: shape.getClientRect().x,
    y: shape.getClientRect().y,
    text: '\n   ',
    fontSize: styleOptions.textSize,
    fontFamily: styleOptions.fontFamily,
    // stroke: styleOptions.textStrokeColor,
    fill: styleOptions.textColor,
    height: shape.getClientRect().height - 40,
    width: shape.getClientRect().width,
    padding: 20,
    align: 'center',
    verticalAlign: 'middle',
    listening: false,
    id: 'conversationText',
    offset: {
      x: 0,
      y: 0,
    },
  });
  group.add(complexText);
  if (drawLayer) {
    stage.on('mousemove', () => {
      updateText(complexText, stage, shape);
      // drawImageMouseMoveListener(stage, shape);
    });
    stage.on('mouseup', () => {
      drawImageMouseUpListener(
        stage,
        shape,
        complexText,
        saveHistory,
        drawLayer,
      );
    });

    initEventListenersConversation(stage, shape, complexText, drawLayer, group);
  }

  // drawLayer.add(tr);
  // tr.nodes([shape]);
  drawLayer?.add(group);

  // const drawImageMouseMoveListener = (stage: Stage, shape: Path) => {
  //   shape.show();
  //   const newWidth = stage.getRelativePointerPosition().x - shape.x();
  //   const newHeight = stage.getRelativePointerPosition().y - shape.y();
  //   shape.setAttrs({ scaleX: newWidth / 50, scaleY: newHeight / 50 });
  // };

  const drawImageMouseUpListener = (
    stage: Stage,
    shape: Path,
    text: Text,
    saveHistory: () => void,
    drawLayer: Layer,
  ) => {
    stage?.off('mousemove');
    stage?.off('mouseup');
    saveHistory();
  };
};

export const initEventListenersConversation = (
  stage: Stage,
  shape: Path,
  complexText: Text,
  drawLayer: Layer,
  group: Group,
) => {
  shape?.on('dragmove', () => {
    updateText(complexText, stage, shape);
  });

  shape?.on('dblclick  dbltap', () => {
    editTextListener(complexText, drawLayer, stage, group, shape);
  });

  shape?.on('transform', () => {
    updateText(complexText, stage, shape);
  });

  group?.setAttrs({ draggable: true });
  shape?.setAttrs({ draggable: true });
};

const updateText = (complexText: Text, stage: Stage, shape: Shape) => {
  complexText?.setAttrs({
    height: shape.getClientRect().height / stage.getAbsoluteScale().y - 40,
    width: shape.getClientRect().width / stage.getAbsoluteScale().x,
    x: shape.getClientRect().x / stage.getAbsoluteScale()?.x,
    y: shape.getClientRect().y / stage.getAbsoluteScale()?.y,
  });
};

const editTextListener = (
  textNode: Text,
  drawLayer: Layer,
  stage: Stage,
  group: Group,
  shape: Path,
) => {
  group.setAttrs({ draggable: false });
  shape.setAttrs({ draggable: false });

  textNode?.opacity(0);
  const tr = drawLayer?.findOne('#pointerTransformer');
  tr?.hide();

  const textarea = document.createElement('div');
  if (
    !document
      .getElementsByClassName('konvajs-content')[0]
      .children.namedItem('conversationText')
  ) {
    document.getElementsByClassName('konvajs-content')[0].appendChild(textarea);
  }
  textarea.setAttribute('name', 'conversationText');
  textarea.setAttribute('contenteditable', 'true');
  textarea.innerText =
    textNode?.attrs.text !== null ? textNode?.attrs.text : '';
  textarea.style.position = 'absolute';
  textarea.style.top = stage.find('#pointerTransformer')[0]?.y() + 'px';
  textarea.style.left = stage.find('#pointerTransformer')[0]?.x() + 'px';
  textarea.style.fontSize = textNode?.getAttr('fontSize') + 'px';
  textarea.style.fontWeight = '800';
  textarea.style.margin = '0px';
  textarea.style.overflow = 'hidden';
  textarea.style.background = 'none';
  textarea.style.outline = 'none';
  textarea.style.resize = 'none';
  textarea.style.lineHeight = textNode?.getAttr('lineHeight');
  textarea.style.fontFamily = textNode?.getAttr('fontFamily');
  textarea.style.textAlign = 'center';
  textarea.style.color = textNode?.getAttr('fill');
  textarea.style.textDecoration = textNode?.getAttr('textDecotarion');
  textarea.style.fontStyle = textNode?.getAttr('fontStyle');
  textarea.style.fontVariant = textNode?.getAttr('fontVariant');
  textarea.style.width =
    drawLayer.findOne('#pointerTransformer')?.width() + 'px';
  textarea.style.minHeight =
    stage.find('#pointerTransformer')[0]?.height() - 40 + 'px';
  textarea.style.verticalAlign = textNode?.getAttr('verticalAlign');
  textarea.style.webkitTextStrokeColor = textNode?.getAttr('stroke');
  textarea.style.padding = '12px';
  const rotation = textNode?.getAttr('rotation');
  textarea.style.transform = 'rotateZ(' + rotation + 'deg)';
  textarea.setAttribute('autofocus', 'true');
  textarea.style.display = 'flex';
  textarea.style.alignItems = 'center';
  textarea.style.justifyContent = 'center';
  textarea.style.cursor = 'text';

  setTimeout(() => {
    textarea.focus();
    window.getSelection()?.selectAllChildren(textarea);
    window.getSelection()?.collapseToEnd();
  });

  const removeTextarea = () => {
    textarea.parentNode?.removeChild(textarea);
    window.removeEventListener('click', handleOutsideClick);
    textNode?.opacity(1);
    tr?.show();
  };

  textarea.addEventListener('keydown', (e) => {
    if (e.keyCode === 13 && !e.shiftKey) {
      textNode.setAttr('text', textarea.innerText);
      removeTextarea();
    }
    // on esc do not set value back to node
    if (e.keyCode === 27) {
      removeTextarea();
    }

    if (e.keyCode === 46) {
      removeTextarea();
    }
  });

  const handleOutsideClick = (e: any) => {
    if (e.target !== textarea) {
      group.setAttrs({ draggable: true });
      shape.setAttrs({ draggable: true });
      textNode?.setAttr('text', textarea.innerText);
      removeTextarea();
    }
  };
  setTimeout(() => {
    window.addEventListener('click', handleOutsideClick);
  });
};
