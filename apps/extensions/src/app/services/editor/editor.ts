/* eslint-disable no-case-declarations */
import IEditorImage from '@/app/interfaces/IEditorImage';
import { saveOriginalImage, updateImageData } from '../screenshots';
import { Stage } from 'konva/lib/Stage';
import Konva from 'konva';
import { Shape, ShapeConfig } from 'konva/lib/Shape';

import { ISize } from '@/content/panel/screens/editorScreen/EditorScreen';
import {
  arrowName,
  commentsName,
  drawnName,
  getLayer,
} from '@/content/panel/screens/editorScreen/editorHelpers/editorHelper';
import { Layer } from 'konva/lib/Layer';
import { Group } from 'konva/lib/Group';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { IEmojiOptions } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IEmojiOptions';
import { toPng } from '@/content/panel/screens/editorScreen/editorHelpers/imageDrawer';
import { ITool } from '@/content/panel/screens/editorScreen/toolsPanel/tools';
import { tools } from '@/content/panel/screens/editorScreen/toolsPanel/tools';
import { IShapeGroupOptions } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IShapeGroupOptions';
import { heartSceneFunc } from '@/content/panel/screens/editorScreen/editorHelpers/drawerHelpers';
import { Text } from 'konva/lib/shapes/Text';
import { Path } from 'konva/lib/shapes/Path';
import {
  baseMarkerOptions,
  baseMarkerTextOptions,
  initEventListenersMarker,
} from '@/content/panel/screens/editorScreen/editorHelpers/markerDrawer';
import { IMarkerOptions } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IMarkerGroupOptions';
import { markerName } from '@/content/panel/screens/editorScreen/editorHelpers/editorHelper';
import { alphabet } from '@/content/panel/screens/editorScreen/editorHelpers/alphabet';
import { IConversationOptions } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IConversationOptions';
import { IArrowGroupOptions } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IArrowGroupOptions';
import { destroyPointerTransformer } from '@/content/panel/screens/editorScreen/editorHelpers/transformerHelper';
import { initEventListeners } from '@/content/panel/screens/editorScreen/editorHelpers/blurDrawer';
import { initEventListenersText } from '@/content/panel/screens/editorScreen/editorHelpers/textDrawer';
import { initEventListenersConversation } from '@/content/panel/screens/editorScreen/editorHelpers/conversationDrawer';
import { initEventListenersComments } from '@/content/panel/screens/editorScreen/editorHelpers/commentsDrawer';
import { initEventListenersArrow } from '@/content/panel/screens/editorScreen/editorHelpers/arrowDrawer';
import { KonvaEventObject } from 'konva/lib/Node';
import { ICommentsOptions } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/ICommentsGroupOptions';
import { IPencilGroupOptions } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IPencilGroupOptions';
import { ITextOptions } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/ITextOptions';
import { IMarkerComment } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IMarkerComment';
import { MarkerAPI } from '../api/markers';
import { IMarker } from '@/app/interfaces/IMarker';
import { IWorkspaceImage } from '@/app/interfaces/IWorkspace';

export class EditorService {
  static renderStage(
    editorImage: IEditorImage,
    originalImageSourceRef: React.MutableRefObject<HTMLImageElement | null>,
    stage: Stage | null,
    setResizeDimentions: (value: React.SetStateAction<ISize>) => void,
    setStage: (value: React.SetStateAction<Stage | null>) => void,
    setLoadingIndicator: (value: React.SetStateAction<boolean>) => void,
    saveHistory: (resizer?: ISize, newStage?: any) => Promise<void>,
    setCurrentShape: React.Dispatch<
      React.SetStateAction<Shape<ShapeConfig> | Group | null>
    >,
    activeTool: ITool | null,
    markerOptions: IMarkerOptions,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group | null>,
    ) => void,
    resetShape: () => void,
    stageScale: number,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    activeWorkspace: any,
    forWorkspace: boolean,
  ): void {
    if (editorImage?.dbData?.stage.renderDimentions) {
      setResizeDimentions({
        width: editorImage.dbData.stage?.renderDimentions.width,
        height: editorImage.dbData.stage?.renderDimentions.height,
      });
    }

    const newStage = Konva.Node.create(
      editorImage?.dbData?.stage.stage,
      'stage',
    );
    const background = newStage?.findOne('#main');

    background.fillPatternImage(originalImageSourceRef.current);
    stage?.destroy();
    this.reRenderElements(
      newStage,
      originalImageSourceRef.current,
      saveHistory,
      setCurrentShape,
      activeTool,
      markerOptions,
      setPointerTarget,
      resetShape,
      stageScale,
      setMarkers,
      editorImage,
      activeWorkspace,
      forWorkspace,
    );
    setStage(newStage);
    setLoadingIndicator(true);

    saveHistory(
      editorImage?.dbData?.stage?.renderDimentions,
      editorImage?.dbData?.stage?.stage,
    );
  }

  static selectLastChild(
    stage: Stage | null,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Group | Shape<ShapeConfig> | null>,
    ) => void,
    setCurrentShape: (
      value: React.SetStateAction<Group | Shape<ShapeConfig> | null>,
    ) => void,
  ): void {
    const layer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (layer !== undefined) {
      const lastChild: Shape<ShapeConfig> | Group | null =
        layer?.getChildren()[layer.getChildren().length - 1];
      setPointerTarget(lastChild);

      if (lastChild instanceof Group && lastChild.hasChildren()) {
        if (lastChild?.children !== undefined) {
          setCurrentShape(lastChild?.children[0]);
        }
      } else {
        setCurrentShape(lastChild);
      }
    }
  }

  static clearStageSettings(
    stage: Stage | null, // Provide the correct type
    setCropperAreaState: (value: React.SetStateAction<boolean>) => void,
  ): void {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      drawLayer.off('mousedown');
      drawLayer.off('click');
      drawLayer.off('mousemove');
      drawLayer.off('drag');
      drawLayer.off('dragstart');
      drawLayer.off('mouseup');
      drawLayer.off('transform');
      // stage && destroyPointerTransformer(stage);
    }
    getLayer(stage, '#cropperLayer')?.destroy();
    setCropperAreaState(false);
    stage?.removeEventListener('mousedown');
    stage?.removeEventListener('mousemove');
    stage?.removeEventListener('mouseup');
    stage?.removeEventListener('drag');
    stage?.removeEventListener('transform');
  }

  static setStageSettings(
    stage: Stage | null,
    pointerEventListener: (e: KonvaEventObject<MouseEvent>) => void,
  ): void {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    const commentsLayer: Layer | undefined = getLayer(stage, '#commentsLayer');
    commentsLayer?.on('mousedown', pointerEventListener);
    drawLayer?.on('mousedown', pointerEventListener);
  }

  static reRenderElements(
    stage: Stage | null,
    imageObj: any,
    saveHistory: (resizer?: ISize, newStage?: any) => Promise<void>,
    setCurrentShape: React.Dispatch<
      React.SetStateAction<Shape<ShapeConfig> | Group | null>
    >,
    activeTool: ITool | null,
    markerOptions: IMarkerOptions,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group | null>,
    ) => void,
    resetShape: () => void,
    stageScale: number,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    editorImage: IEditorImage | IWorkspaceImage,
    activeWorkspace: any,
    forWorkspace: boolean,
  ): void {
    // ... [Content of reRenderElements function] ...
    const layer: Layer | undefined = getLayer(stage, '#drawLayer');
    layer?.getChildren().forEach((figure: any) => {
      if (figure.attrs.shapeType && stage) {
        switch (figure.attrs.shapeType) {
          case 'heart': {
            figure.attrs.sceneFunc = heartSceneFunc;
            figure.draw();
            break;
          }
          case 'blur': {
            figure.attrs.fillPatternImage = imageObj;
            figure.filters([Konva.Filters.Blur]);
            figure.cache();
            initEventListeners(
              stage,
              figure as Shape,
              layer as Layer,
              stageScale / 100,
              // saveHistory,
            );
            break;
          }
          case 'emoji': {
            const image = new Image();
            image.onload = function () {
              figure.image(image);
            };
            image.src = figure.attrs.srcPath;

            break;
          }
        }
      }
      if (figure.attrs.id === 'text' && stage) {
        initEventListenersText(
          stage,
          figure as Text,
          layer,
          saveHistory,
          setCurrentShape,
        );
      }
      if (figure.attrs.id === 'arrowGroup' && stage) {
        const shape: Konva.Path = figure.findOne(`.${arrowName}`);
        if (activeTool) {
          initEventListenersArrow(
            stage,
            shape,
            figure as IArrowGroupOptions,
            figure as Group,
            activeTool,
          );
        }
      }

      if (figure.attrs.id === 'conversationGroup' && stage) {
        const complexText: Konva.Text = figure.findOne('#conversationText');
        const shape: Konva.Path = figure.findOne(`.${drawnName}`);

        initEventListenersConversation(
          stage,
          shape,
          complexText,
          layer,
          figure as Group,
        );
      }

      if (figure.attrs.id === 'markerGroup' && stage) {
        const marker: Konva.Path = figure.findOne(`.${markerName}`);
        const text: Konva.Text = figure.findOne(`.${markerName}Text`);

        initEventListenersMarker(
          stage,
          marker,
          text,
          figure,
          markerOptions,
          setMarkers,
          setCurrentShape,
          editorImage,
          activeWorkspace,
          forWorkspace,
        );
      }
    });
    //restoring the event listeners for markerLayer
    const commentsLayer: Layer | undefined = getLayer(stage, '#commentsLayer');
    commentsLayer?.getChildren().forEach((figure: any) => {
      if (figure.attrs.id === 'commentsGroup' && stage) {
        const comment: Konva.Path = figure.findOne(`.${commentsName}`);

        initEventListenersComments(stage, comment);
      }
    });

    const background = stage?.findOne('#main');
    background?.on('click', () => {
      setPointerTarget(null);
      destroyPointerTransformer(stage);
      resetShape();
    });
  }

  static toggleShapesActivity(
    stage: Stage | null,
    activeTool: ITool | null,
  ): void {
    const drawLayer: Layer | undefined = getLayer(stage, '#drawLayer');
    if (
      activeTool?.tool !== tools.pointer.tool ||
      activeTool?.tool !== tools.redo.tool ||
      activeTool?.tool !== tools.undo.tool
    ) {
      drawLayer?.getChildren().forEach((figure: any) => {
        if (figure.attrs.id !== 'main') {
          figure.setAttrs({ listening: false });
        }
      });
    }
    if (
      activeTool?.tool === tools.pointer.tool ||
      activeTool?.tool === tools.redo.tool ||
      activeTool?.tool === tools.undo.tool
    ) {
      drawLayer?.getChildren().forEach((figure: any) => {
        if (figure.attrs.id !== 'main' && figure.attrs.name !== 'erase') {
          figure.setAttrs({ listening: true });
        }
      });
    }
  }

  static replaceEmoji(
    stage: Stage | null,
    emojiOptions: IEmojiOptions,
    stageScale: number,
  ): void {
    const drawOptions: any = {
      name: drawnName,
      x: stage?.getRelativePointerPosition()?.x,
      y: stage?.getRelativePointerPosition()?.y,
      scale: {
        x: stageScale / 100,
        y: stageScale / 100,
      },
      width: (64 * stageScale) / 100,
      height: (64 * stageScale) / 100,
      opacity: 0.8,
    };

    if (emojiOptions.url !== '') {
      toPng({ width: 600, height: 600, svg: emojiOptions.url })
        .then((pngUrl: string | undefined) => {
          pngUrl &&
            Konva.Image.fromURL(pngUrl, (imageNode: Konva.Image) => {
              imageNode.setAttrs(drawOptions);
              const emoji = imageNode.toDataURL();
              if (stage) stage.container().style.cursor = `url(${emoji}), auto`;
            });
        })
        .catch((err: any) => {
          console.log(err);
        });
    } else {
      if (stage) stage.container().style.cursor = `default`;
    }
  }

  static replaceMarkers(
    stage: Stage,
    markerOptions: IMarkerOptions,
    stageScale: number,
  ) {
    const cursorgroup = new Konva.Group({
      id: 'markerGroup',
      draggable: true,
    });

    const cursormarker = new Path(baseMarkerOptions);
    cursormarker.setAttrs({
      x: stage.getRelativePointerPosition()?.x,
      y: stage.getRelativePointerPosition()?.y,
      fill: markerOptions.fill,
      name: markerName,
      scale: {
        x: (stageScale / 100) * 2,
        y: (stageScale / 100) * 2,
      },
      opacity: 0.7,
    });

    const cursortext: Text = new Text(baseMarkerTextOptions);
    cursortext?.setAttrs({
      id: 'markerText',
      x: (stage.getRelativePointerPosition()?.x ?? 0) + 10,
      y: stage.getRelativePointerPosition()?.y,
      scale: {
        x: stageScale / 100,
        y: stageScale / 100,
      },
      text: alphabet[stage.find('#markerText').length],
      fontSize: 44,
      opacity: 0.7,
    });

    const cursornumbers: Text = new Text(baseMarkerTextOptions);
    cursornumbers.setAttrs({
      id: 'markerNumbers',
      x: (stage.getRelativePointerPosition()?.x ?? 0) + 7,
      y: stage.getRelativePointerPosition()?.y,
      scale: {
        x: stageScale / 100,
        y: stageScale / 100,
      },
      text: String(stage.find('#markerNumbers').length + 1),
      fontSize: 44,
      opacity: 0.7,
    });

    cursorgroup.add(cursormarker);

    if (markerOptions.type === 'number') {
      cursorgroup.add(cursornumbers);
    } else if (
      markerOptions.type === 'alphabet' &&
      stage.find('#markerText').length < alphabet.length
    ) {
      cursorgroup.add(cursortext);
    }
    cursormarker.setAttr('text', Number(cursormarker.getAttr('text')) + 1);
    const mark = cursorgroup.toDataURL();
    stage.container().style.cursor = `url(${mark}), auto`;
  }

  static replaceConversation(
    stage: Stage,
    conversationOptions: IConversationOptions,
  ) {
    const drawOptions: any = {
      width: 64,
      height: 64,
      scale: {
        x: 2,
        y: 2,
      },
      fill: conversationOptions.fillColor,
      stroke: conversationOptions.strokeColor,
      strokeWidth: conversationOptions.strokeWidth,
      id: conversationOptions.category + '/' + conversationOptions.filename,
      draggable: true,
      strokeScaleEnabled: false,
      data: conversationOptions.data,
      dash: conversationOptions.dash,
      pixelRatio: 1,
    };

    const shape = new Konva.Path(drawOptions);
    const shapeCursor = shape.toDataURL();
    stage.container().style.cursor = `url(${shapeCursor}), auto`;
  }

  static changeCursor(
    stage: Stage,
    activeTool: ITool | null,
    emojiOptions: IEmojiOptions,
    stageScale: number,
    markerOptions: IMarkerOptions,
    conversationOptions: IConversationOptions,
    shapeGroupOptions: IShapeGroupOptions,
  ): void {
    const shapeOptions: any = {
      name: drawnName,
      width: 64,
      height: 64,
      // draggable: true,
      scaleX: stageScale / 100,
      scaleY: stageScale / 100,
      stroke: shapeGroupOptions.strokeColor,
      fill: shapeGroupOptions.fillColor,
      strokeWidth: shapeGroupOptions.strokeWidth,
      strokeScaleEnabled: false,
      visible: true,
      pixelRatio: 1,
      opacity: 0.5,
    };

    if (activeTool?.tool === tools.marker.tool) {
      this.replaceMarkers(stage, markerOptions, stageScale);
    }
    if (activeTool?.tool === tools.conversation.tool) {
      return this.replaceConversation(stage, conversationOptions);
    }
    if (activeTool?.tool === tools.emoji.tool) {
      return EditorService.replaceEmoji(stage, emojiOptions, stageScale);
    }
    if (activeTool?.tool === tools.text.tool) {
      stage.container().style.cursor = `text`;
      return;
    }
    if (activeTool?.tool === tools.elipse.tool) {
      const shape = new Konva.Circle(shapeOptions);
      const shapeCursor = shape.toDataURL();
      stage.container().style.cursor = `url(${shapeCursor}), auto`;
      return;
    }
    if (
      activeTool?.tool === tools.rect.tool ||
      activeTool?.tool === tools.square.tool
    ) {
      const shape = new Konva.Rect(shapeOptions);
      const shapeCursor = shape.toDataURL();
      stage.container().style.cursor = `url(${shapeCursor}), auto`;
      return;
    }
    if (activeTool?.tool === tools.star.tool) {
      const shape = new Konva.Star(shapeOptions);
      shape.setAttrs({
        numPoints: 5,
        innerRadius: 18,
        outerRadius: 32,
      });
      const shapeCursor = shape.toDataURL();
      stage.container().style.cursor = `url(${shapeCursor}), auto`;
      return;
    }
    if (activeTool?.tool === tools.triangle.tool) {
      const shape = new Konva.RegularPolygon(shapeOptions);
      shape.setAttrs({ sides: 3 });
      const shapeCursor = shape.toDataURL();
      stage.container().style.cursor = `url(${shapeCursor}), auto`;
      return;
    }
    if (activeTool?.tool === tools.heart.tool) {
      const shape = new Konva.Shape(shapeOptions);
      shape.setAttrs({
        sceneFunc: heartSceneFunc,
      });
      const shapeCursor = shape.toDataURL();

      stage.container().style.cursor = `url(${shapeCursor}), auto`;
      return;
    }
    if (
      activeTool?.tool === tools.roller.tool ||
      activeTool?.tool === tools.pencil.tool ||
      activeTool?.tool === tools.blur.tool ||
      activeTool?.tool === tools.arrow.tool ||
      activeTool?.tool === tools.eraser.tool ||
      activeTool?.tool === tools.crop.tool
    ) {
      stage.container().style.cursor = `crosshair`;
      return;
    }
    if (activeTool?.tool === tools.blob.tool) {
      const shape = new Konva.Line(shapeOptions);
      shape.setAttrs({
        points: [0, 0, 60, 0, 60, 60, 0, 60],
        closed: true,
        tension: 0.1,
      });
      const shapeCursor = shape.toDataURL();

      stage.container().style.cursor = `url(${shapeCursor}), auto`;
      return;
    }
    if (activeTool?.tool === tools.comment.tool) {
      const shape = new Konva.Line(shapeOptions);
      shape.setAttrs({
        points: [0, 0, 80, 0, 80, 60, 12, 60, 0, 80],
        closed: true,
        tension: 0.025,
      });
      const shapeCursor = shape.toDataURL();

      stage.container().style.cursor = `url(${shapeCursor}), auto`;
      return;
    }
    if (activeTool === null || activeTool?.tool === tools.pointer.tool) {
      stage.container().style.cursor = `default`;
      return;
    }
  }

  // ... other methods ...

  static checkShapeType(
    shape: any,
    setCurrentShape: (shape: any) => void,
    dispatch: (...args: any[]) => any,
    shapeGroupOptions: IShapeGroupOptions,
    setShapeGroupOptions: (
      value: React.SetStateAction<IShapeGroupOptions>,
    ) => void,
    conversationOptions: IConversationOptions,
    setConversationOptions: (
      value: React.SetStateAction<IConversationOptions>,
    ) => void,
    markerOptions: IMarkerOptions,
    setMarkerOptions: (value: React.SetStateAction<IMarkerOptions>) => void,
    commentsOptions: ICommentsOptions,
    setCommentsOptions: (value: React.SetStateAction<ICommentsOptions>) => void,
    pencilGroupOptions: IPencilGroupOptions,
    setPencilGroupOptions: (
      value: React.SetStateAction<IPencilGroupOptions>,
    ) => void,
    textOptions: ITextOptions,
    setTextOptions: (value: React.SetStateAction<ITextOptions>) => void,
    arrowGroupOptions: IArrowGroupOptions,
    setArrowGroupOptions: (
      value: React.SetStateAction<IArrowGroupOptions>,
    ) => void,
  ): void {
    // method body...
    // (using the same logic you provided)
    if (
      shape.getAttr('id') !== 'main' &&
      shape.getAttr('name') !== 'circle' &&
      (shape.getAttr('name') === 'drawn' ||
        shape.getAttr('name') === 'arrow' ||
        shape.getAttr('name') === 'marker')
    )
      setCurrentShape(shape);

    if (
      shape.attrs.shapeType === 'heart' ||
      shape.attrs.shapeType === 'elipse' ||
      shape.attrs.shapeType === 'rect' ||
      shape.attrs.shapeType === 'star' ||
      shape.attrs.shapeType === 'triangle' ||
      shape.attrs.shapeType === 'square' ||
      shape.attrs.shapeType === 'comment' ||
      shape.attrs.shapeType === 'blob'
    ) {
      dispatch(PanelAC.setCurrentTool({ name: 'figure' }));
      const currentShapeGroupOptions = {
        ...shapeGroupOptions,
        fillColor: shape.attrs.fill,
        strokeWidth: shape.attrs.strokeWidth,
        strokeColor: shape.attrs.stroke,
      };
      if (
        JSON.stringify(shapeGroupOptions) !==
        JSON.stringify(currentShapeGroupOptions)
      ) {
        setShapeGroupOptions(currentShapeGroupOptions);
      }
    }
    if (shape.attrs.shapeType === 'emoji') {
      dispatch(PanelAC.setCurrentTool({ name: 'emoji' }));
    }
    if (shape.attrs.shapeType === 'conversation') {
      dispatch(PanelAC.setCurrentTool({ name: 'conversation' }));

      const currentConversationOptions = {
        ...conversationOptions,
        textColor: shape.parent?.children[1]?.fill(),
        textStrokeColor: shape.parent?.children[1]?.stroke(),
        textSize: shape.parent?.children[1]?.fontSize(),
        fontFamily: shape.parent?.children[1]?.fontFamily(),
        fillColor: shape.fill(),
        strokeColor: shape.stroke(),
        strokeWidth: shape.strokeWidth(),
        data: shape.data(),
        filename: shape.id().toString().split('/')[1],
        category: shape.id().toString().split('/')[0],
        dash: shape.dash(),
      };

      if (
        JSON.stringify(conversationOptions) !==
        JSON.stringify(currentConversationOptions)
      ) {
        setConversationOptions(currentConversationOptions);
      }
    }

    if (shape.attrs.shapeType === 'marker') {
      dispatch(PanelAC.setCurrentTool({ name: 'marker' }));

      const currentMarkerOptions = {
        ...markerOptions,
        id: shape.parent?.children[1]?.text(),
        position: {
          x: shape.getAbsolutePosition()?.x,
          y: shape.getAbsolutePosition()?.y,
        },
        fill: shape.parent?.children[0]?.fill(),
      };

      if (
        JSON.stringify(markerOptions) !== JSON.stringify(currentMarkerOptions)
      ) {
        setMarkerOptions(currentMarkerOptions);
      }
    }

    if (shape.attrs.shapeType === 'comments') {
      dispatch(PanelAC.setCurrentTool({ name: 'comments' }));

      const currentCommentsOptions = {
        ...commentsOptions,
        id: shape._id,
        fill: shape.parent?.children[0]?.fill(),
        position: {
          x: shape.getAbsolutePosition()?.x,
          y: shape.getAbsolutePosition()?.y,
        },
      };

      if (
        JSON.stringify(commentsOptions) !==
        JSON.stringify(currentCommentsOptions)
      ) {
        setCommentsOptions(currentCommentsOptions);
      }
    }

    if (shape.attrs.shapeType === 'blur') {
      dispatch(PanelAC.setCurrentTool({ name: 'blur' }));
    }
    if (shape.attrs.shapeType === 'free') {
      dispatch(PanelAC.setCurrentTool({ name: 'free' }));
      const currentPencilGroupOptions = {
        ...pencilGroupOptions,
        strokeWidth: shape.attrs.strokeWidth,
        strokeColor: shape.attrs.stroke,
      };
      if (
        JSON.stringify(pencilGroupOptions) !==
        JSON.stringify(currentPencilGroupOptions)
      ) {
        setPencilGroupOptions(currentPencilGroupOptions);
      }
    }
    if (shape.attrs.shapeType === 'text') {
      dispatch(PanelAC.setCurrentTool({ name: 'text' }));
      const currentTextOptions = {
        ...textOptions,
        fill: shape.attrs.fill,
        fontSize: shape.attrs.fontSize,
        stroke: shape.attrs.stroke,
        fontFamily: shape.attrs.fontFamily,
        fontStyle: shape.attrs.fontStyle,
        align: shape.attrs.align,
        textDecoration: shape.attrs.textDecoration,
        fontVariant: shape.attrs.fontVariant,
        text: shape.attrs.text,
      };

      if (JSON.stringify(textOptions) !== JSON.stringify(currentTextOptions)) {
        setTextOptions(currentTextOptions);
      }
    }
    if (
      shape.attrs.shapeType === 'arrow' ||
      shape.attrs.shapeType === 'line' ||
      shape.attrs.shapeType === 'direction' ||
      shape.attrs.shapeType === 'curvaArrow'
    ) {
      dispatch(PanelAC.setCurrentTool({ name: 'arrow' }));
      const currentArrowGroupOptions = {
        ...arrowGroupOptions,
        color: shape.attrs.stroke,
        width: shape.attrs.strokeWidth,
        points: shape.attrs.points,
      };
      if (
        JSON.stringify(arrowGroupOptions) !==
        JSON.stringify(currentArrowGroupOptions)
      ) {
        setArrowGroupOptions(currentArrowGroupOptions);
      }
    }
  }

  static async saveOriginalImageData(image: IEditorImage): Promise<void> {
    const { dbData } = image;
    if (dbData) {
      const originalImageURL = await saveOriginalImage(dbData.refName);
      dbData.originalImage = originalImageURL;
      await updateImageData(dbData);
    }
  }

  static keyPointerTargetListenerInstance(
    e: KeyboardEvent,
    stage: Stage | null,
    pointerTarget: Stage | Shape<ShapeConfig> | Group | null,
    markerOptions: IMarkerOptions,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group | null>,
    ) => void,
    saveHistory: (resizer?: ISize, newStage?: any) => Promise<void>,
  ): void {
    if ((e && e.keyCode === 46) || (e && e.keyCode === 8 && e.ctrlKey)) {
      destroyPointerTransformer(stage);
      if (
        pointerTarget?.parent?.getAttrs().id === 'conversationGroup' ||
        pointerTarget?.parent?.getAttrs().id === 'markerGroup' ||
        pointerTarget?.parent?.getAttrs().id === 'commentsGroup'
      ) {
        if (pointerTarget?.parent?.getAttrs().id === 'markerGroup') {
          pointerTarget?.parent.destroy();
          if (markerOptions.type === 'number') {
            const ctx = stage?.find('#markerNumbers');
            if (ctx) {
              for (let index = 0; index < ctx.length; index++) {
                ctx[index].setAttrs({ text: index + 1 });
              }
            }
          } else {
            const ctx = stage?.find('#markerText');
            if (ctx) {
              for (let index = 0; index < ctx.length; index++) {
                ctx[index].setAttr('text', alphabet[index]);
              }
            }
          }
        } else if (
          pointerTarget?.parent?.getAttrs().id === 'conversationGroup'
        ) {
          const textarea = document.getElementsByName('conversationText')[0];
          textarea?.parentNode?.removeChild(textarea);
          pointerTarget.parent.destroy();
        } else {
          pointerTarget.parent.destroy();
        }
      } else {
        pointerTarget?.destroy();
      }
      setPointerTarget(null);
      saveHistory();
    }
  }

  static toggleMarkerPopup(visible: boolean) {
    const markerPopup = document.getElementById('comment');
    markerPopup?.style.setProperty('opacity', visible ? '1' : '0');
    markerPopup?.style.setProperty('pointerEvents', visible ? 'all' : 'none');
  }

  static async getMarkerComments(
    addComment: React.Dispatch<React.SetStateAction<IMarkerComment[]>>,
    id: string,
  ) {
    try {
      const markers = await MarkerAPI.getAllMarkersByImageId(id);

      if (markers?.data && !markers?.data[0]) {
        console.error('No comments found for the marker.');
        return;
      }

      if (markers.data) {
        const commentsArray = markers.data.reduce(
          (acc: string | any[], marker: { comments: { [x: string]: any } }) => {
            // Check if marker has comments before processing
            if (marker?.comments) {
              const markerComments: any = Object.keys(marker.comments).map(
                (key: any) => ({
                  ...marker.comments[key],
                  id: key,
                }),
              );
              return acc.concat(markerComments);
            }
            return acc; // If no comments, return the accumulator as is
          },
          [],
        ) as IMarkerComment[];

        // Use the provided state updater function to set the comments in the state
        addComment(commentsArray);
      }
    } catch (error) {
      console.error('Error fetching marker comments:', error);
    }
  }
}
