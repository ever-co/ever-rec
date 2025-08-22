import React, { useEffect, useRef, useState } from 'react';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import {
  compareTools,
  ITool,
  tools,
} from 'components/pagesComponents/_editorScreen/toolsPanel/tools';
//Services
import { saveOriginalWSImageData } from 'app/services/workspace';
import { panelRoutes, preRoutes } from 'components/_routes';
import {
  errorMessage,
  infoMessage,
  successMessage,
} from 'app/services/helpers/toastMessages';
import { AppMessagesEnum, IAppMessage } from 'app/utilities/messagess';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import { errorHandler } from 'app/services/helpers/errors';
//Pakages
import Konva from 'konva';
import { Stage } from 'konva/lib/Stage';
import { Layer } from 'konva/lib/Layer';
import { KonvaEventObject } from 'konva/lib/Node';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { useRouter } from 'next/router';
import { Canvg, presets } from 'canvg';
//Interface imports
import IEditorImage, { DbImgData } from '../../app/interfaces/IEditorImage';
import { IPencilGroupOptions } from 'app/interfaces/tools_interfaces/IPencilGroupOptions';
import { IEmojiOptions } from 'app/interfaces/tools_interfaces/IEmojiOptions';
import { IShapeGroupOptions } from 'app/interfaces/tools_interfaces/IShapeGroupOptions';
import { IConversationOptions } from 'app/interfaces/tools_interfaces/IConversationOptions';
import { IWatermarkOptions } from 'app/interfaces/tools_interfaces/IWatermarkOptions';
import { IArrowGroupOptions } from 'app/interfaces/tools_interfaces/IArrowGroupOptions';
import { ITextOptions } from 'app/interfaces/tools_interfaces/ITextOptions';
import { IToolsOptions } from 'app/interfaces/tools_interfaces/IToolsOptions';
import { IMarkerOptions } from 'app/interfaces/tools_interfaces/IMarkerGroupOptions';
import { IMarkerComment } from 'app/interfaces/IMarkerComment';

//Constructors and destructors
import {
  initArrowGroupOptions,
  initCommentsOptions,
  initConversationOptions,
  initEmojiOptions,
  initMarkerOptions,
  initPencilGroupOptions,
  initShapeGroupOptions,
  initTextOptions,
  initWatermarkOptions,
} from 'components/pagesComponents/_editorScreen/initialToolsSettings';
import {
  GlobalCompositeOperation,
  initFreeDraw,
} from 'components/pagesComponents/_editorScreen/editorHelpers/freeDrawer';
import { initBlurDraw } from 'components/pagesComponents/_editorScreen/editorHelpers/blurDrawer';
import { initConversationDraw } from 'components/pagesComponents/_editorScreen/editorHelpers/conversationDrawer';
import {
  destroyAnchor,
  initArrowDraw,
} from 'components/pagesComponents/_editorScreen/editorHelpers/arrowDrawer';
import { initTextDrawer } from 'components/pagesComponents/_editorScreen/editorHelpers/textDrawer';
import {
  baseMarkerOptions,
  initMarkerDraw,
  setPosition,
} from 'components/pagesComponents/_editorScreen/editorHelpers/markerDrawer';
import { initCommentsDraw } from 'components/pagesComponents/_editorScreen/editorHelpers/commentsDrawer';
import {
  destroyPointerTransformer,
  initPointerTransformer,
} from 'components/pagesComponents/_editorScreen/editorHelpers/transformerHelper';
import { initImageDraw } from 'components/pagesComponents/_editorScreen/editorHelpers/imageDrawer';
import { initShapeDraw } from 'components/pagesComponents/_editorScreen/editorHelpers/shapeDrawer';
import { initCrop } from 'components/pagesComponents/_editorScreen/editorHelpers/cropperDrawer';
import { alphabet } from 'components/pagesComponents/_editorScreen/editorHelpers/alphabet';
import {
  arrowName,
  blurName,
  commentsName,
  drawnName,
  getLayer,
  markerName,
} from 'components/pagesComponents/_editorScreen/editorHelpers/editorHelper';
//Components
import ToolsPanel from '../../components/pagesComponents/_editorScreen/toolsPanel/ToolsPanel';
import AppSpinner from '../../components/containers/appSpinner/AppSpinner';
import AppButton from '../../components/controls/AppButton';
import EditorComments from 'components/pagesComponents/_editorScreen/editorHelpers/commentsPopup/EditorComments';
import MarkersContentManager from 'components/pagesComponents/_editorScreen/editorHelpers/manageMarkersContent/markersContentManager';
import MarkerContentPopup from 'components/pagesComponents/_editorScreen/editorHelpers/markersPopup/MarkerContentPopup';
//Importing utilities
import { updateUserAuthAC } from 'app/utilities/user';

//Store
import PanelAC from '../../app/store/panel/actions/PanelAC';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';
import { getWorkspaceImageAPI } from 'app/services/api/workspace';
import { IWorkspaceImage } from 'app/interfaces/IWorkspace';
import styles from '../../pagesScss/edit/edit.module.scss';
import { ToolbarService } from 'app/services/editor/toolbar';
import { EditorService } from 'app/services/editor/editor';
import { MarkerAPI } from 'app/services/api/markers';
import { IMarker } from 'app/interfaces/IMarker';
import { io } from 'socket.io-client';
//Editor

export interface ISize {
  width: number;
  height: number;
}

export interface IHistory {
  stage: any;
  img: string;
  renderDimentions: { width: number; height: number };
}

const EditorScreen: React.FC = () => {
  const originalImageSourceRef = useRef<HTMLImageElement | null>(null);
  const dispatch = useDispatch();
  const preset = presets.offscreen();
  const router = useRouter();
  const {
    unsavedBase64,
    capturedTitle,
    sourceUrl,
  }: { unsavedBase64: string; capturedTitle: string; sourceUrl: string } =
    useSelector((state: RootStateOrAny) => state.panel);
  const user = useAuthenticateUser();
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const [stageScale, setStageScale] = useState<number>(100);
  //const [backgroundImage, setBackgroundImage] = useState<Rect | null>(null);
  const [mainScale, setMainScale] = useState<number | null>(null);
  const [initStage, setInitStage] = useState<boolean>(false);
  const [panel3D, setPanel3D] = useState<boolean>(false);
  const [undostate, setUndoState] = useState<boolean>(false);
  const [resized, setResized] = useState<boolean>(false);
  const [cropped, setCropped] = useState<boolean>(false);
  const [clipboardCopyEnabled, setClipboardCopyEnabled] =
    useState<boolean>(true);
  const [history, setHistory] = useState<IHistory[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const [resizerState, setResizer] = useState<ISize | null>(null);
  const [initialDimentions, setInitialDimentions] = useState<ISize>({
    width: 0,
    height: 0,
  });
  const [resizeDimentions, setResizeDimentions] = useState<ISize>({
    width: 0,
    height: 0,
  });
  const activeWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const workspaceLoaded = useSelector(
    (state: RootStateOrAny) => state.panel.workspaceLoaded,
  );
  const editorImage: IEditorImage | IWorkspaceImage = useSelector(
    (state: RootStateOrAny) => state.panel.editorImage,
  );
  const [activeTool, setActiveTool] = useState<ITool | null>(null);
  const [pointerTarget, setPointerTarget] = useState<
    Stage | Shape<ShapeConfig> | Group | null
  >(null);
  const [forWorkspace, setForWorkspace] = useState(false);
  const [keyPointerTargetListener, setkeyPointerTargetListener] = useState<{
    listener: any;
  }>({ listener: null });
  const [comments, setComments] = useState<Array<IMarkerComment>>([]);
  const [cropperAreaState, setCropperAreaState] = useState<boolean>(false);
  const [pencilGroupOptions, setPencilGroupOptions] =
    useState<IPencilGroupOptions>(initPencilGroupOptions());
  const [emojiOptions, setEmojiOptions] =
    useState<IEmojiOptions>(initEmojiOptions());
  const [shapeGroupOptions, setShapeGroupOptions] =
    useState<IShapeGroupOptions>(initShapeGroupOptions());
  const [conversationOptions, setConversationOptions] =
    useState<IConversationOptions>(initConversationOptions());
  const [markerOptions, setMarkerOptions] =
    useState<IMarkerOptions>(initMarkerOptions());
  const [commentsOptions, setCommentsOptions] = useState<ICommentsOptions>(
    initCommentsOptions(),
  );
  const [watermarkOptions, setWatermarkOptions] = useState<IWatermarkOptions>(
    initWatermarkOptions(),
  );
  const [arrowGroupOptions, setArrowGroupOptions] =
    useState<IArrowGroupOptions>(initArrowGroupOptions());
  const [textOptions, setTextOptions] =
    useState<ITextOptions>(initTextOptions());
  const [currentShape, setCurrentShape] = useState(null);
  const [toolsOptions, setToolsOptions] = useState<IToolsOptions>({
    fillColor: 'rgba(255, 255, 255, 0)',
    strokeColor: 'rgba(0, 0, 0, 255)',
    strokeWidth: 2,
    numPoints: 5,
    innerRadius: 20,
    outerRadius: 20,
  });

  const [markers, setMarkers] = useState<IMarker[]>([]);

  const perfectScale = ((mainScale || 0) * stageScale) / 100;

  const [recordingController, setRecordingController] =
    useState<JSX.Element | null>(null);

  const resetShape = () => {
    setCurrentShape(null);
  };

  const switch3D = () => {
    setPanel3D(!panel3D);
  };

  const clearActiveTool = () => {
    setActiveTool(null);
  };

  const getImage = async () => {
    await EditorService.getImage(
      router,
      setImageLoaded,
      dispatch,
      preRoutes,
      panelRoutes,
    );
  };

  const getImageWorkspace = async () => {
    await EditorService.getImageWorkspace(
      router,
      activeWorkspace,
      setImageLoaded,
      errorHandler,
      getWorkspaceImageAPI as any,
      dispatch,
    );
  };

  const selectLastChild = () => {
    EditorService.selectLastChild(stage, setPointerTarget, setCurrentShape);
  };

  const uploadToCloudHandler = async (name: string) => {
    ToolbarService.uploadToCloudHandler(
      name,
      stage as any,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setImageLoaded,
    );
  };

  const clear = () => {
    ToolbarService.clear(stage as any, history, setHistory);
  };

  const undo = (all = false) => {
    ToolbarService.undo(
      historyStep,
      setHistoryStep,
      renderStep,
      setUndoState,
      setPointerTarget,
      setCropped,
      clearActiveTool,
      all,
    );
  };

  const redo = () => {
    ToolbarService.redo(
      historyStep,
      history,
      setHistoryStep,
      renderStep,
      setUndoState,
      setPointerTarget,
      clearActiveTool,
    );
  };

  const cut = async () => {
    ToolbarService.cut(
      pointerTarget as any,
      stage as any,
      destroyPointerTransformer,
    );
  };

  const clipboardCopy = async () => {
    ToolbarService.clipboardCopy(
      stage as any,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setClipboardCopyEnabled,
      setActiveTool,
      errorHandler,
      successMessage,
    );
  };

  const save = async (disableNotification?: boolean) => {
    await ToolbarService.saveToDatabase(
      forWorkspace,
      activeWorkspace,
      stage as any,
      markers,
      resizeDimentions,
      initialDimentions,
      stageScale,
      editorImage,
      cropped,
      disableNotification,
    );
  };

  const pdfSave = async () => {
    await ToolbarService.saveImageAs(
      stage as any,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setActiveTool,
      editorImage,
      'pdf',
    );
  };

  const pngSave = () => {
    ToolbarService.saveImageAs(
      stage as any,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setActiveTool,
      editorImage,
      'png',
    );
  };

  const jpgSave = () => {
    ToolbarService.saveImageAs(
      stage as any,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setActiveTool,
      editorImage,
      'jpg',
    );
  };

  const renderStep = (step: number) => {
    EditorService.renderStep(
      step,
      history,
      setResizeDimentions,
      originalImageSourceRef as any,
      stage as any,
      reRenderElements,
      setStage,
    );
    setCurrentShape(null);
  };

  const reRenderElements = async (stage: Stage, imageObj: any) => {
    //restoring the event listeners for drawLayer
    EditorService.reRenderElements(
      stage,
      imageObj,
      stageScale,
      saveHistory,
      setCurrentShape,
      activeTool as any,
      setPointerTarget,
      markerOptions,
      setMarkers,
      editorImage,
      activeWorkspace,
      forWorkspace,
    );
  };

  const saveHistory = async (resizer?: ISize, newStage?: any) => {
    if (historyStep === -1) {
      clear();
    }
    setUndoState(true);
    const img = editorImage.dbData?.originalImage
      ? editorImage.dbData.originalImage
      : editorImage.url;

    const historyArr =
      historyStep >= 0
        ? history.slice(0, historyStep + (undostate ? 2 : 1))
        : [...history];
    if (img) {
      historyArr.push({
        stage: newStage ? newStage : stage?.toObject(),
        img,
        renderDimentions: resizer
          ? {
            width: resizer.width,
            height: resizer.height,
          }
          : {
            width:
              resizeDimentions.width !== 0
                ? resizeDimentions.width
                : initialDimentions.width,
            height:
              resizeDimentions.height !== 0
                ? resizeDimentions.height
                : initialDimentions.height,
          },
      });
      setHistory(historyArr);
      setHistoryStep(historyArr.length - 1);

      if (
        // activeTool?.tool !== tools.marker.tool &&
        activeTool?.tool !== tools.arrow.tool &&
        activeTool?.tool !== tools.eraser.tool &&
        activeTool?.tool !== tools.pencil.tool &&
        activeTool?.tool !== tools.roller.tool &&
        activeTool?.tool !== tools.pointer.tool &&
        activeTool?.tool !== tools.watermark.tool &&
        activeTool?.tool !== tools.resize.tool &&
        activeTool?.tool !== tools.crop.tool
      ) {
        historyStep === -1 ? clearActiveTool() : setActiveTool(tools.pointer);
      }

      if (
        activeTool?.tool !== tools.marker.tool &&
        activeTool?.tool !== tools.arrow.tool &&
        activeTool?.tool !== tools.curvaArrow.tool &&
        activeTool?.tool !== tools.direction.tool &&
        activeTool?.tool !== tools.line.tool &&
        activeTool?.tool !== tools.eraser.tool &&
        activeTool?.tool !== tools.text.tool &&
        activeTool?.tool !== tools.pointer.tool &&
        activeTool?.tool !== tools.watermark.tool &&
        activeTool?.tool !== tools.resize.tool &&
        activeTool?.tool !== tools.crop.tool &&
        activeTool?.tool !== tools.undo.tool &&
        activeTool?.tool !== tools.redo.tool
      ) {
        selectLastChild();
      }
    }
    // save(true);
  };

  const updateDependedActiveTool = (dependencies: ITool[]) => {
    dependencies.some((tool) => compareTools(activeTool, tool)) &&
      setActiveTool(Object.assign({}, activeTool));
  };

  const updateFigureProperties = (shape: any, options: any) => {
    if (shape) {
      shape.strokeWidth(options.strokeWidth);
      shape.stroke(options.strokeColor);
      shape.fill(options.fillColor);
      saveHistory();
    }
  };

  const updateConversationProperties = (shape: any, options: any) => {
    if (shape) {
      shape.parent?.children[1]?.fill(options.textColor);
      shape.parent?.children[1]?.stroke(options.textStrokeColor);
      shape.parent?.children[1]?.fontSize(options.textSize);
      shape.parent?.children[1]?.fontFamily(options.fontFamily);
      shape.fill(options.fillColor);
      shape.stroke(options.strokeColor);
      shape.strokeWidth(options.strokeWidth);
      saveHistory();
    }
  };

  const updateMarkerProperties = (shape: any, options: any) => {
    if (shape) {
      shape.parent?.children[0]?.fill(options.fill);
      saveHistory();
    }
  };

  const updateArrowProperties = (shape: any, options: any) => {
    if (shape) {
      shape.strokeWidth(options.width);
      shape.stroke(options.color);
      shape.fill(options.color);
      shape.draw();
      shape.cache();
      saveHistory();
    }
  };

  const updateTextProperties = (shape: any, options: any) => {
    if (shape) {
      shape?.fontFamily(options.fontFamily);
      shape.fill(options.fill);
      shape.fontSize(options.fontSize);
      shape.stroke(options.stroke);
      shape.textDecoration(options.textDecoration);
      shape.align(options.align);
      shape.fontStyle(options.fontStyle);
      shape.fontVariant(options.fontVariant);
      // shape.text(options.text);
      saveHistory();
    }
  };
  const updateFreeProperties = (shape: any, options: any) => {
    if (shape) {
      shape.strokeWidth(options.strokeWidth);
      shape.stroke(options.strokeColor);
      saveHistory();
    }
  };

  const onCropHandler = () => {
    const tr = getLayer(stage, '#cropperLayer')?.findOne('#cropperTransformer');

    if (tr && stage) {
      const x =
        tr.x() / (stage?.scale()?.x || 1) -
        stage.position().x / (stage?.scale()?.x || 1);

      const y =
        tr.y() / (stage?.scale()?.y || 1) -
        stage.position().y / (stage?.scale()?.y || 1);

      stage.offsetX(stage.offsetX() + x);
      stage.offsetY(stage.offsetY() + y);

      setResizeDimentions({
        width: tr.width() / stage.scaleX(),
        height: tr.height() / stage.scaleY(),
      });

      saveHistory({
        width: tr.width() / stage.scaleX(),
        height: tr.height() / stage.scaleY(),
      });
      setCropped(true);
    }
    clearActiveTool();
  };

  //#region "Pointer tool"

  const keyPointerTargetListenerInstance = (e: KeyboardEvent) => {
    if ((e && e.keyCode === 46) || (e && e.keyCode === 8 && e.ctrlKey)) {
      destroyPointerTransformer(stage);
      if (
        pointerTarget?.parent?.getAttrs().id === 'conversationGroup' ||
        pointerTarget?.parent?.getAttrs().id === 'markerGroup' ||
        pointerTarget?.parent?.getAttrs().id === 'commentsGroup'
      ) {
        // pointerTarget?.parent.destroy();
        // setPointerTarget(null);

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
          pointerTarget?.parent?.destroy();
        } else {
          pointerTarget?.parent?.destroy();
        }
      } else {
        pointerTarget?.destroy();
      }
      setPointerTarget(null);
      saveHistory();
    }
  };

  //=================================================================================================================================
  //THIS ============================================================================================================================

  const checkShapeType = (shape: any) => {
    if (
      shape.getAttr('id') !== 'main' &&
      shape.getAttr('name') !== 'circle' &&
      (shape.getAttr('name') === 'drawn' ||
        shape.getAttr('name') === 'arrow' ||
        shape.getAttr('name') === 'marker')
    )
      setCurrentShape(shape);

    if (
      shape.attrs.shapeType == 'heart' ||
      shape.attrs.shapeType == 'elipse' ||
      shape.attrs.shapeType == 'rect' ||
      shape.attrs.shapeType == 'star' ||
      shape.attrs.shapeType == 'triangle' ||
      shape.attrs.shapeType == 'square' ||
      shape.attrs.shapeType == 'comment' ||
      shape.attrs.shapeType == 'blob'
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
    if (shape.attrs.shapeType == 'emoji') {
      dispatch(PanelAC.setCurrentTool({ name: 'emoji' }));
    }
    if (shape.attrs.shapeType == 'conversation') {
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

    if (shape.attrs.shapeType == 'marker') {
      dispatch(PanelAC.setCurrentTool({ name: 'marker' }));

      const currentMarkerOptions = {
        ...markerOptions,
        id: shape.parent?.children[1]?.text(),
        position: {
          x: shape.getAbsolutePosition().x,
          y: shape.getAbsolutePosition().y,
        },
        fill: shape.parent?.children[0]?.fill(),
      };

      if (
        JSON.stringify(markerOptions) !== JSON.stringify(currentMarkerOptions)
      ) {
        setMarkerOptions(currentMarkerOptions);
      }
    }

    if (shape.attrs.shapeType == 'comments') {
      dispatch(PanelAC.setCurrentTool({ name: 'comments' }));

      const currentCommentsOptions = {
        ...commentsOptions,
        id: shape._id,
        fill: shape.parent?.children[0]?.fill(),
        position: {
          x: shape.getAbsolutePosition().x,
          y: shape.getAbsolutePosition().y,
        },
      };

      if (
        JSON.stringify(commentsOptions) !==
        JSON.stringify(currentCommentsOptions)
      ) {
        setCommentsOptions(currentCommentsOptions);
      }
    }

    if (shape.attrs.shapeType == 'blur') {
      dispatch(PanelAC.setCurrentTool({ name: 'blur' }));
    }
    if (shape.attrs.shapeType == 'free') {
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
    if (shape.attrs.shapeType == 'text') {
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
      shape.attrs.shapeType == 'arrow' ||
      shape.attrs.shapeType == 'line' ||
      shape.attrs.shapeType == 'direction' ||
      shape.attrs.shapeType == 'curvaArrow'
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
  };

  const initPointer = () => {
    if (stage) {
      destroyPointerTransformer(stage);
      initPointerTransformer(stage, [pointerTarget], () => saveHistory());
    }
  };

  const renderCropBar = () => {
    if (compareTools(activeTool, tools.crop) && cropperAreaState) {
      return (
        <div
          id="cropper1"
          className={styles.cropWrapper}
          style={{ transition: '0.05s', zIndex: '99' }}
        >
          <div className={styles.cropInnerContainer}>
            <AppButton onClick={onCropHandler} className={styles.cropBtn} full>
              <div className={styles.cropBtnContent}> Crop</div>
            </AppButton>

            <AppButton
              onClick={() => setActiveTool(null)}
              bgColor={styles.cropBg}
              className={styles.cancelBtn}
              full
              outlined
            >
              <div className={styles.cropBtnContent}>Cancel</div>
            </AppButton>
          </div>
        </div>
      );
    }
  };

  const onResize = (width: number, height: number) => {
    if (stage) {
      setStageScale(100);
      setResizer({ width, height });
    }
  };

  const resizer = () => {
    setStageScale(100);
    const { width, height } = initialDimentions;
    const layer: Layer | undefined = getLayer(stage, '#drawLayer');
    const mainLayer: Layer | undefined = getLayer(stage, '#mainLayer');
    if (
      stage &&
      resizerState &&
      !cropped &&
      !editorImage?.dbData?.stage?.cropped
    ) {
      stage.width(resizerState.width);
      stage.height(resizerState.height);
      const newWidth = stage.width();
      const newHeight = stage.height();
      const scaleX = newWidth / width;
      const scaleY = newHeight / height;
      layer?.getChildren().forEach((figure: any) => {
        if (figure.attrs.id == 'main') {
          const rect: Rect = figure;
          rect.fillPatternScaleX(scaleX);
          rect.fillPatternScaleY(scaleY);

          rect.width(resizerState.width);
          rect.height(resizerState.height);
          setMainScale(perfectScale);
          saveHistory(resizerState);
          setResizeDimentions({
            width: resizerState.width,
            height: resizerState.height,
          });
        } else if (figure.attrs) {
          const item: Konva.Image = figure;
          const newWidth = stage.width();
          const newHeight = stage.height();
          const scaleX = newWidth / width;
          const scaleY = newHeight / height;
          const scale = Math.max(scaleX, scaleY);
          const newX = (item.x() / item.scaleX()) * scaleX;
          const newY = (item.y() / item.scaleY()) * scaleY;
          item.position({
            x: newX,
            y: newY,
          });
          item.scaleX(scaleX);
          item.scaleY(scaleY);
          if (item && pointerTarget) {
            initPointer();
          }
        }
      });

      mainLayer?.getChildren().forEach((figure: any) => {
        if (figure.attrs.id == 'stageBackground') {
          const rect: Rect = figure;
          rect.fillPatternScaleX(scaleX);
          rect.fillPatternScaleY(scaleY);

          rect.width(resizerState.width);
          rect.height(resizerState.height);
          setMainScale(perfectScale);
          saveHistory(resizerState);
          setResizeDimentions({
            width: resizerState.width,
            height: resizerState.height,
          });
        }
      });

      setResizer(null);
    }
    if (cropped || editorImage?.dbData?.stage?.cropped) {
      infoMessage('We are working hard to make the cropped image resizable');
    }
  };

  useEffect(() => {
    // Connect to your server
    const socket = io(process.env.NEXT_PUBLIC_API_BASE_URL || '', {
      transports: ['websocket'],
    });

    // Listen for 'connect' event
    socket.on('connect', () => {
      console.info('Successfully connected to the websocket');
    });

    // Listen for 'markers-updated' event
    socket.on('markers-updated', (data) => {
      console.log(data);
      if (data?.uid !== user?.id) {
        data.markers && setMarkers(JSON.parse(data.markers));
      }
    });

    // Cleanup the effect (disconnect) when the component is unmounted.
    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const allComments = markers?.flatMap((marker) => marker.comments);
    if (comments !== allComments) {
      setComments(allComments);
    }
  }, [markers]);

  useEffect(() => {
    document.title = 'Rec - Editor';
    dispatch(
      PanelAC.setCurrentTool({ name: tools.pointer.tool, clicked: true }),
    );
    setActiveTool(tools.pointer);
    return () => {
      document.title = 'Rec';
    };
  }, []);

  useEffect(() => {
    const { workspaceId } = router.query;
    workspaceId && setForWorkspace(true);

    if (workspaceId && !activeWorkspace) {
      setImageLoaded(false);
    }
    if (workspaceId && activeWorkspace && editorImage) {
      setImageLoaded(true);
    }

    if (editorImage && !editorImage?.dbData?.originalImage) {
      !workspaceId
        ? EditorService.saveOriginalImageData(editorImage)
        : saveOriginalWSImageData(
          activeWorkspace?.id,
          editorImage.dbData?.refName || '',
          editorImage,
        );
    }

    !editorImage && (workspaceId ? getImageWorkspace() : getImage());
  }, [activeWorkspace, router.isReady]);

  useEffect(() => {
    if (editorImage) {
      EditorService.loadStage(
        editorImage,
        originalImageSourceRef as any,
        setMainScale,
        setInitialDimentions,
        setPointerTarget,
        resetShape,
        setImageLoaded,
        setStage,
        setResizeDimentions,
        stage as any,
        stageScale,
        saveHistory,
        setCurrentShape,
        activeTool as any,
        markerOptions,
        setMarkers,
        activeWorkspace,
        forWorkspace,
      );

      editorImage.dbData?.markers &&
        setMarkers(JSON.parse(editorImage.dbData.markers));

      // setComments(JSON.parse(editorImage.dbData.comments))
      // EditorService.getMarkerComments(setComments, editorImage.dbData.id);
    }
  }, [editorImage]);

  useEffect(() => {
    const listener = async (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.saveImage) {
        const updateUser = async () => {
          await updateUserAuthAC();
        };
        updateUser();
      }
      return true;
    };

    // browser.runtime.onMessage.addListener(listener);
    // return () => browser.runtime.onMessage.removeListener(listener);
  }, [user]);

  useEffect(() => {
    if (stage && !initStage) {
      !editorImage.dbData?.stage && saveHistory();
      setInitStage(true);
    }
  }, [stage, initStage]);

  useEffect(() => {
    stage &&
      EditorService.changeCursor(
        stage,
        activeTool as any,
        drawnName,
        stageScale,
        emojiOptions,
        shapeGroupOptions,
        markerOptions,
        conversationOptions,
      );
    stage && destroyPointerTransformer(stage);
    stage && destroyAnchor(stage);
    stage && EditorService.toggleShapesActivity(stage, activeTool as any);
    setPointerTarget(null);
  }, [activeTool?.tool]);

  useEffect(() => {
    stage &&
      EditorService.changeCursor(
        stage,
        activeTool as any,
        drawnName,
        stageScale,
        emojiOptions,
        shapeGroupOptions,
        markerOptions,
        conversationOptions,
      );
  }, [shapeGroupOptions]);

  useEffect(() => {
    EditorService.clearStageSettings(stage as any, setCropperAreaState);
    EditorService.setStageSettings(
      stage as any,
      activeTool as any,
      setPointerTarget,
      setActiveTool,
      checkShapeType,
    );

    if (stage && activeTool) {
      if (
        [tools.pencil, tools.eraser, tools.roller].some((tool) =>
          compareTools(activeTool, tool),
        )
      ) {
        const operation: GlobalCompositeOperation = compareTools(
          activeTool,
          tools.eraser,
        )
          ? 'destination-out'
          : 'source-over';
        initFreeDraw({
          stage,
          options: pencilGroupOptions,
          operation,
          saveHistory,
        });
      }

      compareTools(activeTool, tools.crop) &&
        initCrop({ stage, setCropperAreaState });
      [
        tools.rect,
        tools.elipse,
        tools.circle,
        tools.star,
        tools.triangle,
        tools.heart,
        tools.square,
        tools.blob,
        tools.comment,
      ].some((tool) => compareTools(tool, activeTool)) &&
        initShapeDraw({
          stage,
          activeTool,
          options: shapeGroupOptions,
          saveHistory,
          stageScale,
        });

      [tools.arrow, tools.line, tools.curvaArrow, tools.direction].some(
        (tool) => compareTools(tool, activeTool),
      ) &&
        initArrowDraw({
          stage,
          activeTool,
          toolsOptions: arrowGroupOptions,
          saveHistory,
        });

      compareTools(activeTool, tools.text) &&
        initTextDrawer({
          stage,
          activeTool,
          textOptions,
          setPointerTarget,
          setActiveTool,
          saveHistory,
          setCurrentShape,
        });

      compareTools(activeTool, tools.emoji) &&
        initImageDraw({
          options: {
            shapeType: tools.emoji.tool,
            imageName: emojiOptions.filename,
            fullpath: emojiOptions.url,
            proportional: true,
          },
          stage,
          saveHistory,
          stageScale,
        });

      compareTools(activeTool, tools.conversation) &&
        initConversationDraw({
          options: {
            shapeType: tools.conversation.tool,
            imageName: conversationOptions.filename,
            fullpath: `${process.env.API_BASE_URL}/images/conversation/${conversationOptions.filename}`,
          },
          styleOptions: {
            filename: conversationOptions.filename,
            category: conversationOptions.category,
            fillColor: conversationOptions.fillColor,
            strokeColor: conversationOptions.strokeColor,
            strokeWidth: conversationOptions.strokeWidth,
            textColor: conversationOptions.textColor,
            textSize: conversationOptions.textSize,
            textStrokeColor: conversationOptions.textStrokeColor,
            textStrokeWidth: conversationOptions.textStrokeWidth,
            fontFamily: conversationOptions.fontFamily,
            data: conversationOptions.data,
            dash: conversationOptions.dash,
          },
          stage,
          saveHistory,
        });

      compareTools(activeTool, tools.marker) &&
        initMarkerDraw({
          stage,
          options: {
            id: commentsOptions.id,
            fill: markerOptions.fill,
            type: markerOptions.type,
            position: commentsOptions.position,
            text: user.displayName?.[0]?.toUpperCase() || '',
          },
          shapeType: tools.marker.tool,
          imageId: editorImage.dbData?.id || '',
          userId: user.id,
          saveHistory,
          setMarkers,
          setCurrentShape,
          editorImage,
          activeWorkspace,
          forWorkspace,
        });

      compareTools(activeTool, tools.comments) &&
        initCommentsDraw({
          stage,
          options: {
            id: commentsOptions.id,
            fill: commentsOptions.fill,
            position: commentsOptions.position,
            text: user.displayName?.[0]?.toUpperCase() || '',
          },
          shapeType: tools.comments.tool,
          saveHistory,
        });

      compareTools(activeTool, tools.blur) &&
        initBlurDraw({
          stage,
          stageScale,
          saveHistory,
          mainScale: mainScale || 0,
          resized,
        });

      compareTools(activeTool, tools.undo);
      compareTools(activeTool, tools.redo);
      compareTools(activeTool, tools.clear);
      // changeCursor(stage);
    }
  }, [activeTool]);

  useEffect(() => {
    if (history.length && activeTool) {
      setActiveTool(Object.assign({}, activeTool));
    }
  }, [history]);

  useEffect(() => {
    updateTextProperties(currentShape, textOptions);

    updateDependedActiveTool([
      tools.eraser,
      tools.rect,
      tools.circle,
      tools.text,
      tools.arrow,
      tools.star,
    ]);
  }, [toolsOptions, textOptions]);

  useEffect(() => {
    updateFigureProperties(currentShape, shapeGroupOptions);
    updateDependedActiveTool([tools.elipse, tools.rect, tools.star]);
  }, [shapeGroupOptions]);

  useEffect(() => {
    updateFreeProperties(currentShape, pencilGroupOptions);
    updateDependedActiveTool([tools.pencil, tools.roller, tools.eraser]);
  }, [pencilGroupOptions]);

  useEffect(() => {
    updateDependedActiveTool([tools.emoji]);
  }, [emojiOptions]);

  useEffect(() => {
    updateConversationProperties(currentShape, conversationOptions);
    updateDependedActiveTool([tools.conversation]);
  }, [conversationOptions]);

  useEffect(() => {
    updateMarkerProperties(currentShape, markerOptions);
    updateDependedActiveTool([tools.marker]);
  }, [markerOptions]);

  useEffect(() => {
    updateArrowProperties(currentShape, arrowGroupOptions);
    updateDependedActiveTool([
      tools.arrow,
      tools.line,
      tools.curvaArrow,
      tools.direction,
    ]);
  }, [arrowGroupOptions]);

  useEffect(() => {
    const scaleCoefficient = stageScale / 100;
    const { width, height } =
      resizeDimentions?.height === 0 && resizeDimentions?.width === 0
        ? initialDimentions
        : resizeDimentions;
    if (stage && mainScale) {
      stage.height(height * mainScale * scaleCoefficient);
      stage.width(width * mainScale * scaleCoefficient);
      stage.scaleX(scaleCoefficient * mainScale);
      stage.scaleY(scaleCoefficient * mainScale);
    }

    if ((currentShape as any)?.attrs.shapeType === tools.marker.tool) {
      stage && currentShape && setPosition(stage, currentShape);
    }
  }, [stageScale, stage, resizeDimentions, initialDimentions, mainScale]);

  useEffect(() => {
    if (resizerState) {
      setResized(true);
      resizer();
      saveHistory(resizerState);
    }
  }, [resizerState]);

  useEffect(() => {
    if (
      (activeTool === tools.pointer ||
        activeTool === tools.redo ||
        activeTool === tools.redo) &&
      pointerTarget
    ) {
      keyPointerTargetListener &&
        window.removeEventListener(
          'keydown',
          keyPointerTargetListener.listener,
        );
      setkeyPointerTargetListener({
        listener: keyPointerTargetListenerInstance,
      });
      initPointer();
    }
    // EditorService.toggleMarkerPopup(false);
  }, [activeTool, pointerTarget]);

  useEffect(() => {
    keyPointerTargetListener &&
      window.addEventListener('keydown', keyPointerTargetListener.listener);
  }, [keyPointerTargetListener]);

  // Preview before drawing Start ------------------
  useEffect(() => {
    if (activeTool?.tool === tools.marker.tool) {
      stage &&
        EditorService.replaceMarkers(
          stage,
          baseMarkerOptions,
          markerOptions,
          markerName,
          stageScale,
        );
    }
  });

  useEffect(() => {
    if (activeTool?.tool === tools.emoji.tool) {
      stage &&
        EditorService.replaceEmoji(stage, drawnName, stageScale, emojiOptions);
    }
  }, [emojiOptions.url]);

  useEffect(() => {
    if (activeTool?.tool === tools.conversation.tool) {
      stage && EditorService.replaceConversation(stage, conversationOptions);
    }
  }, [conversationOptions.filename, conversationOptions]);

  // Preview before drawing End ------------------
  useEffect(() => {
    const undoListener = async (all = false) => {
      const newStep = all ? 0 : historyStep - 1;
      if (newStep >= 0) {
        setHistoryStep(newStep);
        renderStep(newStep);
        setUndoState(false);
        setPointerTarget(null);
      }
      if (all) {
        setResizeDimentions({ width: 0, height: 0 });
        setCropped(false);
      }

      clearActiveTool();
    };

    const redoListener = async () => {
      const newStep = historyStep + 1;
      if (newStep < history.length) {
        setHistoryStep(newStep);
        renderStep(newStep);
        setUndoState(false);
        setPointerTarget(null);
      }
      clearActiveTool();
    };

    const handleChange = (event) => {
      if (event && event.keyCode === 90 && event.ctrlKey && historyStep > 0) {
        undoListener();
      }

      if (
        event &&
        event.keyCode === 89 &&
        event.ctrlKey &&
        historyStep < history.length - 1
      ) {
        redoListener();
      }
    };

    window.addEventListener('keydown', handleChange);
    return () => {
      window.removeEventListener('keydown', handleChange);
    };
  }, [historyStep]);

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', function (e) {
      // on esc do not set value back to node
      if (e && e.keyCode === 27) {
        setActiveTool(null);
        resetShape();
        // EditorService.toggleMarkerPopup(false);
      }
    });
  }

  return (
    <div
      className={styles.pageContainer}
      style={{
        backgroundImage: `url('leak_bg-min.png')`,
        backgroundSize: 'cover',
        justifyContent: 'center',
        padding: '8px',
      }}
    >
      {stage && (
        <ToolsPanel
          stage={stage}
          initialDimentions={initialDimentions}
          resizeDimentions={resizeDimentions}
          stageScale={stageScale}
          onSaveHistory={saveHistory}
          onUndo={undo}
          onRedo={redo}
          onCut={cut}
          onSave={save}
          clipboardCopyEnabled={clipboardCopyEnabled}
          clipboardCopy={clipboardCopy}
          onSaveAsPDF={pdfSave}
          onSaveAsPNG={pngSave}
          onSaveAsJPG={jpgSave}
          onResize={onResize}
          canUndo={historyStep > 0}
          canRedo={historyStep < history.length - 1}
          pointerTarget={pointerTarget}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          toolsOptions={toolsOptions}
          onToolsOptionsChange={setToolsOptions}
          onPencilGroupOptionsChange={setPencilGroupOptions}
          textOptions={textOptions}
          pencilGroupOptions={pencilGroupOptions}
          emojiOptions={emojiOptions}
          shapeGroupOptions={shapeGroupOptions}
          conversationOptions={conversationOptions}
          watermarkOptions={watermarkOptions}
          arrowGroupOptions={arrowGroupOptions}
          onTextOptionsChange={setTextOptions}
          onEmojiOptionsChange={setEmojiOptions}
          onShapeGroupOptionsChange={setShapeGroupOptions}
          onConversationOptionsChange={setConversationOptions}
          markerOptions={markerOptions}
          onMarkerOptionsChange={setMarkerOptions}
          commentsOptions={commentsOptions}
          onCommentsOptionsChange={setCommentsOptions}
          onWatermarkOptionsChange={setWatermarkOptions}
          onArrowGroupOptionsChange={setArrowGroupOptions}
          onStageScaleChange={setStageScale}
          user={user}
          onResetShape={resetShape}
          oldName={String(editorImage.dbData?.title)}
          onUploadToDrive={uploadToCloudHandler}
          panel3D={panel3D}
          switch3D={switch3D}
          capturedTitle={capturedTitle}
          sourceUrl={sourceUrl}
          setRecordingController={setRecordingController}
          editorImage={editorImage}
          setLoading={setImageLoaded}
          workspace={forWorkspace && activeWorkspace}
        />
      )}
      <div className={styles.popupContainer}>
        {(currentShape as any)?.attrs.shapeType === tools.marker.tool ? (
          <MarkerContentPopup
            currentShape={currentShape}
            user={user}
            comments={comments}
            editorImage={editorImage}
            setMarkers={setMarkers}
            markers={markers}
            activeWorkspace={activeWorkspace}
            forWorkspace={forWorkspace}
          />
        ) : (
          <></>
        )}{' '}
      </div>
      <div id="stage" className={styles.stageContainer}>
        {renderCropBar()}
      </div>
      <div>{recordingController}</div>

      <MarkersContentManager
        user={user}
        commentsOptions={commentsOptions}
        onCommentsOptionsChange={setCommentsOptions}
        currentShape={currentShape}
        scale={stageScale}
        comments={comments}
      // addComment={addComment}
      />
      <AppSpinner show={!imageLoaded} tip="Loading image..." />
    </div>
  );
};

export default EditorScreen;
