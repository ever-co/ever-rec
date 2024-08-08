import { Layer } from 'konva/lib/Layer';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { Text } from 'konva/lib/shapes/Text';
import { Stage } from 'konva/lib/Stage';
import { ITool } from '../toolsPanel/tools';
import { ITextOptions } from 'app/interfaces/tools_interfaces/ITextOptions';
import { drawnName, getLayer } from './editorHelper';

export interface ITextDrawer {
  stage: Stage;
  activeTool: ITool;
  textOptions: ITextOptions;
  setPointerTarget: (pointerTarget: Shape<ShapeConfig> | null) => void;
  setActiveTool: (tool: ITool) => void;
  saveHistory: () => void;
  setCurrentShape: any;
}

export const initTextDrawer = ({
  stage,
  activeTool,
  textOptions,
  setPointerTarget,
  setActiveTool,
  saveHistory,
  setCurrentShape,
}: ITextDrawer) => {
  stage.on('mousedown', () =>
    drawShapeMouseDownListener({
      stage,
      activeTool,
      textOptions,
      setPointerTarget,
      setActiveTool,
      saveHistory,
      setCurrentShape,
    }),
  );
};

const drawShapeMouseDownListener = ({
  stage,
  activeTool,
  textOptions,
  setPointerTarget,
  setActiveTool,
  saveHistory,
  setCurrentShape,
}: ITextDrawer) => {
  if (stage && activeTool) {
    stage.off('mousedown');

    const width = 400; // competitors don't have such predefined width, their textbox expands with each character
    const stageX = stage.getRelativePointerPosition().x;

    // Adjust textbox position relative to pointer position and text align - left / center / right
    let x = stageX;
    if (textOptions.align === 'center') {
      x = stageX - width / 2;
    } else if (textOptions.align === 'right') {
      x = stageX - (width - 15);
    }

    const textNode: Text = new Text({
      id: 'text',
      name: 'drawn',
      width,
      x,
      y: stage.getRelativePointerPosition().y - 35,
      draggable: true,
      text: '',
      fontFamily: textOptions.fontFamily,
      fontSize: textOptions.fontSize,
      fontStyle: textOptions.fontStyle,
      fill: textOptions.fill,
      stroke: textOptions.stroke,
      strokeWidth: 1,
      align: textOptions.align,
      textDecoration: textOptions.textDecoration,
      fontVariant: textOptions.fontVariant,
      padding: 10,
      pixelRatio: 2,
      shapeType: 'text',
    });

    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      drawLayer.add(textNode);

      initEventListenersText(
        stage,
        textNode,
        drawLayer,
        saveHistory,
        setCurrentShape,
      );

      // setActiveTool(tools.pointer);

      editTextListener(
        textNode,
        drawLayer,
        stage,
        saveHistory,
        setCurrentShape,
      );
    }
    saveHistory();
  }
};
export const initEventListenersText = (
  stage: Stage,
  textNode: Text,
  drawLayer: Layer,
  saveHistory: () => void,
  setCurrentShape: any,
) => {
  textNode?.on('dblclick dbltap', () => {
    editTextListener(textNode, drawLayer, stage, saveHistory, setCurrentShape);
  });

  textNode.on('transform', function () {
    textNode.setAttrs({
      width: textNode.width() * textNode.scaleX(),
      scaleX: 1,
      autofocus: true,
    });
  });
};
export const editTextListener = (
  textNode: Text,
  drawLayer: Layer,
  stage: Stage,
  saveHistory: () => void,
  setCurrentShape: any,
) => {
  const tr = drawLayer?.findOne('#pointerTransformer');
  textNode.hide();
  tr?.hide();
  const textPosition = textNode.absolutePosition();

  // create textarea and style it
  const textarea = document.createElement('textarea');
  document.getElementsByClassName('konvajs-content')[0].appendChild(textarea);
  textarea.style.scale = `${stage.scaleX()}`;
  textarea.value = textNode.text();
  textarea.style.position = 'absolute';
  textarea.style.top = textPosition.y + 'px';
  textarea.style.left = textPosition.x + 'px';
  textarea.style.fontSize = textNode.fontSize() + 'px';
  textarea.style.border = '1px dashed rgb(91, 77, 190)';
  textarea.style.margin = '0px';
  textarea.style.overflow = 'hidden';
  textarea.style.background = 'none';
  textarea.style.outline = 'none';
  textarea.style.resize = 'both';
  textarea.style.lineHeight = '1';
  textarea.style.fontFamily = textNode.fontFamily();
  textarea.style.transformOrigin = 'left top';
  textarea.style.textAlign = textNode.align();
  textarea.style.color = textNode.fill();
  textarea.style.fontStyle = textNode.fontStyle();
  textarea.style.fontVariant = textNode.fontVariant();
  textarea.style.webkitTextStrokeWidth = textNode.strokeWidth() + 'px';
  textarea.style.webkitTextStrokeColor = textNode.stroke();
  textarea.style.padding = '8px';
  textarea.style.textDecoration = textNode.textDecoration();
  textarea.style.width = textNode.width() + 'px';
  const rotation = textNode.rotation();
  textarea.style.transform = 'rotateZ(' + rotation + 'deg)';
  textarea.setAttribute('autofocus', 'true');
  textarea.style.height = textarea.scrollHeight + 'px';
  textarea.style.fontStyle = textNode.fontStyle().includes('italic')
    ? 'italic'
    : '';

  textarea.style.fontWeight = textNode.fontStyle().includes('bold')
    ? 'bold'
    : '';

  setTimeout(() => {
    textarea.focus();
  });

  function removeTextarea() {
    if (textarea.value.length > 0) {
      textNode.text(textarea.value);
      textNode.width(textarea.clientWidth);
      textarea.parentNode?.removeChild(textarea);
      window.removeEventListener('mouseup', handleOutsideClick);
      stage.off('click');
      textNode.show();
      tr?.show();

      // if (textNode.text.toString() !== textarea.value) {
      //   saveHistory();
      // }
    } else {
      textarea.parentNode?.removeChild(textarea);
      textNode.destroy();
    }

    //tr?.forceUpdate();
  }

  function setTextareaWidth(newWidth: any) {
    textarea.style.width = newWidth + 'px';
  }

  textarea.addEventListener('keydown', function (e) {
    if (e.keyCode === 13 && !e.shiftKey) {
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

  textarea.addEventListener('keydown', function (e) {
    if (textarea.offsetHeight < Number(textarea.scrollHeight)) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  });

  function handleOutsideClick(e: any) {
    if (e.target !== textarea) {
      removeTextarea();
    }
  }

  stage.on('click', (e) => {
    if (e.target.attrs.name !== drawnName) setCurrentShape(textNode);
  });
  setTimeout(() => {
    window.addEventListener('mouseup', handleOutsideClick);
  });
};
