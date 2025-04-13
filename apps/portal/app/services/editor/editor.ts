/* eslint-disable no-case-declarations */
import IEditorImage from 'app/interfaces/IEditorImage';
import {
  getImageById,
  saveOriginalImage,
  updateImageData,
} from '../screenshots';
import { IHistory, ISize } from 'pages/edit/[id]';
import { Stage } from 'konva/lib/Stage';
import Konva from 'konva';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import {
  arrowName,
  blurName,
  commentsName,
  drawnName,
  getLayer,
} from 'components/pagesComponents/_editorScreen/editorHelpers/editorHelper';
import { Layer } from 'konva/lib/Layer';
import { Group } from 'konva/lib/Group';
import { NextRouter } from 'next/router';
import { IDataResponse, ResStatusEnum } from 'app/interfaces/IApiResponse';
import { IWorkspaceImage } from 'app/interfaces/IWorkspace';
import PanelAC from 'store/panel/actions/PanelAC';
import { Dispatch } from 'react';
import { IEmojiOptions } from 'app/interfaces/tools_interfaces/IEmojiOptions';
import { toPng } from 'components/pagesComponents/_editorScreen/editorHelpers/imageDrawer';
import { ITool } from 'components/pagesComponents/_editorScreen/toolsPanel/tools';
import { tools } from 'components/pagesComponents/_editorScreen/toolsPanel/tools';
import { IShapeGroupOptions } from 'app/interfaces/tools_interfaces/IShapeGroupOptions';
import { heartSceneFunc } from 'components/pagesComponents/_editorScreen/editorHelpers/drawerHelpers';
import { Text } from 'konva/lib/shapes/Text';
import { Path } from 'konva/lib/shapes/Path';
import {
  baseMarkerOptions,
  baseMarkerTextOptions,
  initEventListenersMarker,
} from 'components/pagesComponents/_editorScreen/editorHelpers/markerDrawer';
import { IMarkerOptions } from 'app/interfaces/tools_interfaces/IMarkerGroupOptions';
import { markerName } from 'components/pagesComponents/_editorScreen/editorHelpers/editorHelper';
import { alphabet } from 'components/pagesComponents/_editorScreen/editorHelpers/alphabet';
import { IConversationOptions } from 'app/interfaces/tools_interfaces/IConversationOptions';
import { IArrowGroupOptions } from 'app/interfaces/tools_interfaces/IArrowGroupOptions';
import { destroyPointerTransformer } from 'components/pagesComponents/_editorScreen/editorHelpers/transformerHelper';
import { initEventListeners } from 'components/pagesComponents/_editorScreen/editorHelpers/blurDrawer';
import { initEventListenersText } from 'components/pagesComponents/_editorScreen/editorHelpers/textDrawer';
import { initEventListenersArrow } from 'components/pagesComponents/_editorScreen/editorHelpers/arrowDrawer';
import { initEventListenersConversation } from 'components/pagesComponents/_editorScreen/editorHelpers/conversationDrawer';
import { initEventListenersComments } from 'components/pagesComponents/_editorScreen/editorHelpers/commentsDrawer';
import { KonvaEventObject } from 'konva/lib/Node';
import { IMarkerComment } from 'app/interfaces/IMarkerComment';
import { MarkerAPI } from '../api/markers';
import { IMarker } from 'app/interfaces/IMarker';

export class EditorService {
  static renderStage(
    editorImage: IEditorImage | IWorkspaceImage,
    stage: Stage,
    originalImageSourceRef: React.MutableRefObject<HTMLImageElement>,
    setResizeDimentions: (value: React.SetStateAction<ISize>) => void,
    setStage: (value: React.SetStateAction<Stage>) => void,
    saveHistory: (resizer?: ISize, newStage?: any) => Promise<void>,
    stageScale: number,
    setCurrentShape: React.Dispatch<any>,
    activeTool: ITool,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group>,
    ) => void,
    markerOptions: IMarkerOptions,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    activeWorkspace: any,
    forWorkspace: boolean,
  ) {
    if (editorImage.dbData?.stage?.renderDimentions) {
      setResizeDimentions({
        width: editorImage?.dbData?.stage?.renderDimentions?.width,
        height: editorImage?.dbData?.stage?.renderDimentions?.height,
      });
    }

    const newStage = Konva.Node.create(
      editorImage?.dbData?.stage?.stage,
      'stage',
    );
    const background = newStage?.findOne('#main');

    background.fillPatternImage(originalImageSourceRef.current);
    stage?.destroy();
    this.reRenderElements(
      newStage,
      originalImageSourceRef.current,
      stageScale,
      saveHistory,
      setCurrentShape,
      activeTool,
      setPointerTarget,
      markerOptions,
      setMarkers,
      editorImage,
      activeWorkspace,
      forWorkspace,
    );
    this.toggleShapesActivity(newStage, activeTool);
    setStage(newStage);

    saveHistory(
      editorImage.dbData?.stage?.renderDimentions,
      editorImage?.dbData?.stage?.stage,
    );
  }

  static loadStage(
    editorImage: IEditorImage | IWorkspaceImage,
    originalImageSourceRef: React.MutableRefObject<HTMLImageElement>,
    setMainScale: (value: React.SetStateAction<number>) => void,
    setInitialDimentions: (value: React.SetStateAction<ISize>) => void,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group>,
    ) => void,
    resetShape: () => void,
    setImageLoaded: (value: React.SetStateAction<boolean>) => void,
    setStage: (value: React.SetStateAction<Stage>) => void,
    setResizeDimentions: (value: React.SetStateAction<ISize>) => void,
    stage: Stage,
    stageScale: number,
    saveHistory: (resizer?: ISize, newStage?: any) => Promise<void>,
    setCurrentShape: React.Dispatch<any>,
    activeTool: ITool,
    markerOptions: IMarkerOptions,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    activeWorkspace: any,
    forWorkspace: boolean,
  ) {
    if (editorImage && originalImageSourceRef) {
      const innerImage = new Image();
      innerImage.crossOrigin = 'Anonymous';
      innerImage.src = editorImage.dbData?.originalImage
        ? editorImage.dbData?.originalImage
        : editorImage.url || '';

      originalImageSourceRef.current = innerImage;

      innerImage.onload = function () {
        const stage = new Konva.Stage({
          container: 'stage',
          width:
            innerImage.width < window.innerWidth
              ? innerImage.width
              : window.innerWidth,
        });

        const stageBackground = new Konva.Rect({
          id: 'stageBackground',
          fill: 'white',
          width: innerImage.width,
          height: innerImage.height,
          fillPatternScaleX: 1,
          fillPatternScaleY: 1,
        });

        const backgroundImage = new Konva.Rect({
          id: 'main',
          fillPatternImage: innerImage,
          width: innerImage.width,
          height: innerImage.height,
          fillPatternScaleX: 1,
          fillPatternScaleY: 1,
        });

        const width = stage.width();
        const height = stage.height();

        const imageWidth = backgroundImage.fillPatternImage().width || width;
        const imageHeight = backgroundImage.fillPatternImage().height || height;

        const scaleX = width / imageWidth;
        const scaleY = height / imageHeight;
        const scale = Math.max(scaleX, scaleY);
        setMainScale(scale);
        setInitialDimentions({
          width: innerImage.width,
          height: innerImage.height,
        });
        stage.height(backgroundImage.height());

        const mainLayer = new Konva.Layer({ id: 'mainLayer' });
        mainLayer.add(stageBackground);
        stage.add(mainLayer);
        mainLayer.draw();

        backgroundImage.on('click', () => {
          setPointerTarget(null as any);
          destroyPointerTransformer(stage);
          resetShape();
        });

        const drawLayer = new Konva.Layer({ id: 'drawLayer' });
        stage.add(drawLayer);
        drawLayer.draw();
        drawLayer.add(backgroundImage);

        const commentsLayer = new Konva.Layer({ id: 'commentsLayer' });
        stage.add(commentsLayer);
        commentsLayer.draw();

        setImageLoaded(true);
        setStage(stage);

        if (editorImage.dbData?.stage) {
          EditorService.renderStage(
            editorImage,
            stage,
            originalImageSourceRef,
            setResizeDimentions,
            setStage,
            saveHistory,
            stageScale,
            setCurrentShape,
            activeTool,
            setPointerTarget,
            markerOptions,
            setMarkers,
            activeWorkspace,
            forWorkspace,
          );
        }
      };
    }
  }

  static async saveOriginalImageData(image: IEditorImage) {
    const { dbData } = image;
    if (dbData) {
      try {
        const originalImageURL = await saveOriginalImage(dbData.refName);

        if (dbData) {
          dbData.originalImage = originalImageURL || undefined;
        }
        await updateImageData(dbData);
      } catch (err) {
        console.error('Error in saveOriginalImageData function:', err);
      }
    }
  }
  static renderStep(
    step: number,
    history: IHistory[],
    setResizeDimentions: (dimensions: React.SetStateAction<ISize>) => void,
    originalImageSourceRef: React.MutableRefObject<HTMLImageElement>,
    stage: Stage,
    reRenderElements: (stage: Stage, imageObj: any) => void,
    setStage: (newStage: React.SetStateAction<Stage>) => void,
  ) {
    if (history.length > 0) {
      setResizeDimentions(history[step]?.renderDimentions);
    }

    const newStage = Konva.Node.create(history[step].stage, 'stage');
    const background = newStage?.findOne('#main');

    background.fillPatternImage(originalImageSourceRef.current);
    stage?.destroy();
    reRenderElements(newStage, originalImageSourceRef.current);
    setStage(newStage);
  }

  static selectLastChild(
    stage: any, // Define the type more strictly if possible.
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group>,
    ) => void,

    setCurrentShape: (shape: any) => void,
  ) {
    const layer: Layer | undefined = getLayer(stage, '#drawLayer');
    const lastChild: Shape<ShapeConfig> | Group = layer?.getChildren()[
      layer.getChildren().length - 1
    ] as any;
    setPointerTarget(lastChild);
    if (lastChild instanceof Group) {
      setCurrentShape(lastChild.children[0]);
    } else {
      setCurrentShape(lastChild);
    }
  }

  static async getImageWorkspace(
    router: NextRouter,
    activeWorkspace: any,
    setImageLoaded: (loaded: boolean) => void,
    errorHandler: (response: any) => void,
    getWorkspaceImageAPI: (
      workspaceId: any,
      imageId: string,
    ) => Promise<IDataResponse<IWorkspaceImage>>,
    dispatch: Dispatch<any>,
  ) {
    if (router.isReady) {
      setImageLoaded(false);
      const { id } = router.query;
      if (activeWorkspace && id) {
        const response = await getWorkspaceImageAPI(
          activeWorkspace.id,
          id as string,
        );

        if (response.status === ResStatusEnum.error) {
          errorHandler(response);
        } else {
          const image = response.data as IWorkspaceImage;
          dispatch(PanelAC.setEditorImage({ editorImage: image }));
        }
      }
    }
  }

  static async getImage(
    router: NextRouter,
    setImageLoaded: (value: boolean) => void,
    dispatch: Dispatch<any>,
    preRoutes: any,
    panelRoutes: any,
  ) {
    if (router.isReady) {
      try {
        setImageLoaded(false);
        const { id } = router.query;
        if (id && typeof id === 'string') {
          const image = await getImageById(id);
          !image && router.push(preRoutes.media + panelRoutes.images);
          dispatch(PanelAC.setEditorImage({ editorImage: image as any }));
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  static setShapeCursor(stage: Stage, shape: Konva.Shape) {
    const shapeCursor = shape.toDataURL();
    stage.container().style.cursor = `url(${shapeCursor}), auto`;
  }

  static getShapeByTool(
    activeTool: ITool,
    shapeOptions: any,
  ): Konva.Shape | null {
    switch (activeTool?.tool) {
      case tools.elipse.tool:
        return new Konva.Circle(shapeOptions);

      case tools.rect.tool:
        return null;

      case tools.square.tool:
        return new Konva.Rect(shapeOptions);

      case tools.star.tool:
        const star = new Konva.Star(shapeOptions);
        star.setAttrs({ numPoints: 5, innerRadius: 18, outerRadius: 32 });
        return star;

      case tools.triangle.tool:
        const triangle = new Konva.RegularPolygon(shapeOptions);
        triangle.setAttrs({ sides: 3 });
        return triangle;

      case tools.heart.tool:
        const heart = new Konva.Shape(shapeOptions);
        heart.setAttrs({ sceneFunc: heartSceneFunc });
        return heart;

      case tools.blob.tool:
        const blob = new Konva.Line(shapeOptions);
        blob.setAttrs({
          points: [0, 0, 60, 0, 60, 60, 0, 60],
          closed: true,
          tension: 0.1,
        });
        return blob;

      case tools.comment.tool:
        const comment = new Konva.Line(shapeOptions);
        comment.setAttrs({
          points: [0, 0, 80, 0, 80, 60, 12, 60, 0, 80],
          closed: true,
          tension: 0.025,
        });
        return comment;

      default:
        return null;
    }
  }

  static changeCursor(
    stage: Stage,
    activeTool: ITool,
    drawnName: string,
    stageScale: number,
    emojiOptions: IEmojiOptions,
    shapeGroupOptions: IShapeGroupOptions,
    markerOptions: IMarkerOptions,
    conversationOptions: IConversationOptions,
  ) {
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

    if (activeTool?.tool === tools.marker.tool)
      return this.replaceMarkers(
        stage,
        baseMarkerOptions,
        markerOptions,
        markerName,
        stageScale,
      );
    if (activeTool?.tool === tools.conversation.tool)
      return this.replaceConversation(stage, conversationOptions);
    if (activeTool?.tool === tools.emoji.tool)
      return this.replaceEmoji(stage, drawnName, stageScale, emojiOptions);
    if (activeTool?.tool === tools.text.tool) {
      stage.container().style.cursor = `text`;
      return;
    }

    const specialTools = [
      tools.roller.tool,
      tools.pencil.tool,
      tools.blur.tool,
      tools.arrow.tool,
      tools.eraser.tool,
      tools.crop.tool,
    ];
    if (specialTools.includes(activeTool?.tool)) {
      stage.container().style.cursor = `crosshair`;
      return;
    }

    const shape = this.getShapeByTool(activeTool, shapeOptions);
    if (shape) {
      this.setShapeCursor(stage, shape);
      return;
    }

    if (!activeTool || activeTool?.tool === tools.pointer.tool) {
      stage.container().style.cursor = `default`;
    }
  }

  static replaceEmoji(
    stage: Stage,
    drawnName: string,
    stageScale: number,
    emojiOptions: IEmojiOptions,
  ) {
    const drawOptions: any = {
      name: drawnName,
      x: stage.getRelativePointerPosition()?.x,
      y: stage.getRelativePointerPosition()?.y,
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
        .then((pngUrl) => {
          Konva.Image.fromURL(pngUrl, (imageNode: Konva.Image) => {
            imageNode.setAttrs(drawOptions);
            const emoji = imageNode.toDataURL();
            stage.container().style.cursor = `url(${emoji}), auto`;
          });
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      stage.container().style.cursor = `default`;
    }
  }

  static replaceMarkers(
    stage: Stage,
    baseMarkerOptions: any,
    markerOptions: any,
    markerName: string,
    stageScale: number,
  ): void {
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
        x: (stageScale / 100) * 1.1,
        y: (stageScale / 100) * 1.1,
      },
      opacity: 0.7,
    });

    const cursortext: Text = new Text({
      ...baseMarkerTextOptions,
      padding: baseMarkerTextOptions.padding - 6, // padding is reduced to maintain cursor position
    });
    cursortext?.setAttrs({
      id: 'markerText',
      x: stage.getRelativePointerPosition()?.x || 0,
      y: stage.getRelativePointerPosition()?.y || 0,
      scale: {
        x: stageScale / 100,
        y: stageScale / 100,
      },
      text: alphabet[stage.find('#markerText').length],
      fontSize: 20,
      opacity: 0.7,
    });
    const cursornumbers: Text = new Text({
      ...baseMarkerTextOptions,
      padding: baseMarkerTextOptions.padding - 6, // padding is reduced to maintain cursor position
    });

    cursornumbers.setAttrs({
      id: 'markerNumbers',
      x: stage.getRelativePointerPosition()?.x || 0,
      y: stage.getRelativePointerPosition()?.y || 0,
      scale: {
        x: stageScale / 100,
        y: stageScale / 100,
      },
      text: String(stage.find('#markerNumbers').length + 1),
      fontSize: 20,
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
  ): void {
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

  static async reRenderElements(
    stage: Stage,
    imageObj: any,
    stageScale: number,
    saveHistory: (resizer?: ISize, newStage?: any) => Promise<void>,
    setCurrentShape: React.Dispatch<any>,
    activeTool: ITool,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group>,
    ) => void,
    markerOptions: IMarkerOptions,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    editorImage: IEditorImage | IWorkspaceImage,
    activeWorkspace: any,
    forWorkspace: boolean,
  ) {
    //restoring the event listeners for drawLayer
    const layer: Layer | undefined = getLayer(stage, '#drawLayer');
    layer?.getChildren().forEach((figure: any) => {
      if (figure.attrs.shapeType) {
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

      if (figure.attrs.id === 'text') {
        initEventListenersText(
          stage,
          figure as Konva.Text,
          layer,
          saveHistory,
          setCurrentShape,
        );
      }

      if (figure.attrs.id === 'arrowGroup') {
        const shape: Konva.Path = figure.findOne(`.${arrowName}`);

        initEventListenersArrow(
          stage,
          shape,
          figure as IArrowGroupOptions,
          figure as Group,
          activeTool,
        );
      }

      if (figure.attrs.id === 'conversationGroup') {
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

      if (figure.attrs.id === 'markerGroup') {
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
    //restoring the event listeners for notesLayer
    const commentsLayer: Layer | undefined = getLayer(stage, '#commentsLayer');
    commentsLayer?.getChildren().forEach((figure: any) => {
      if (figure.attrs.id === 'commentsGroup') {
        const comment: Konva.Path = figure.findOne(`.${commentsName}`);

        initEventListenersComments(stage, comment);
      }
    });

    const background = stage.findOne('#main');
    background?.on('click', () => {
      setPointerTarget(null as any);
      destroyPointerTransformer(stage);
      setCurrentShape(null);
    });
  }

  static toggleShapesActivity(stage: Stage, activeTool: ITool) {
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

  static pointerEventListener(
    e: KonvaEventObject<MouseEvent>,
    stage: Stage,
    activeTool: ITool,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group>,
    ) => void,
    setActiveTool: (value: React.SetStateAction<ITool>) => void,
    checkShapeType: (shape: any) => void,
  ) {
    checkShapeType(e.target);
    if (
      stage &&
      (activeTool?.tool === tools.pointer.tool ||
        activeTool?.tool === tools.undo.tool ||
        activeTool?.tool === tools.redo.tool) &&
      (e.target.name() === drawnName ||
        e.target.name() === blurName ||
        e.target.name() === arrowName ||
        e.target.name() === markerName ||
        e.target.name() === commentsName)
    ) {
      setPointerTarget(e.target);
      setActiveTool(tools.pointer);
    }
  }

  static clearStageSettings(
    stage: Stage,
    setCropperAreaState: (value: React.SetStateAction<boolean>) => void,
  ) {
    const drawLayer = getLayer(stage, '#drawLayer');
    if (drawLayer) {
      drawLayer.off('mousedown');
      drawLayer.off('click');
      drawLayer.off('mousemove');
      drawLayer.off('drag');
      drawLayer.off('dragstart');
      drawLayer.off('mouseup');
      drawLayer.off('transform');
      // stage && destroyPointerTransformer(stage);
      // destroyAnchor(stage);
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
    stage: Stage,
    activeTool: ITool,
    setPointerTarget: (
      value: React.SetStateAction<Stage | Shape<ShapeConfig> | Group>,
    ) => void,
    setActiveTool: (value: React.SetStateAction<ITool>) => void,
    checkShapeType: (shape: any) => void,
  ) {
    const drawLayer = getLayer(stage, '#drawLayer');
    const commentsLayer = getLayer(stage, '#commentsLayer');

    commentsLayer?.on('mousedown', (e: KonvaEventObject<MouseEvent>) =>
      this.pointerEventListener(
        e,
        stage,
        activeTool,
        setPointerTarget,
        setActiveTool,
        checkShapeType,
      ),
    );
    drawLayer?.on('mousedown', (e: KonvaEventObject<MouseEvent>) =>
      this.pointerEventListener(
        e,
        stage,
        activeTool,
        setPointerTarget,
        setActiveTool,
        checkShapeType,
      ),
    );
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

      if (!markers?.data?.length) {
        console.error('No comments found for the marker.');
        return;
      }

      const commentsArray: IMarkerComment[] = markers.data.reduce(
        (acc, marker) => {
          // Check if marker has comments before processing
          if (marker?.comments) {
            const markerComments = Object.keys(marker.comments).map((key) => ({
              ...marker.comments[key],
              id: key,
            }));
            return acc.concat(markerComments as any);
          }
          return acc; // If no comments, return the accumulator as is
        },
        [],
      );

      // Use the provided state updater function to set the comments in the state
      addComment(commentsArray);
    } catch (error) {
      console.error('Error fetching marker comments:', error);
    }
  }
}
