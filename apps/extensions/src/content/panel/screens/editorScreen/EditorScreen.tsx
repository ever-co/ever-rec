import React, { useEffect, useRef, useState } from 'react';
import 'clipboard-polyfill/overwrite-globals';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import IEditorImage from '@/app/interfaces/IEditorImage';
import AppSpinner from '@/content/components/containers/appSpinner/AppSpinner';
import ToolsPanel from './toolsPanel/ToolsPanel';
import Konva from 'konva';
import { Stage } from 'konva/lib/Stage';
import { compareTools, ITool, tools } from './toolsPanel/tools';
import { Layer } from 'konva/lib/Layer';
import { KonvaEventObject } from 'konva/lib/Node';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import { initTextDrawer } from './editorHelpers/textDrawer';
import {
  destroyPointerTransformer,
  initPointerTransformer,
} from './editorHelpers/transformerHelper';
import { destroyAnchor, initArrowDraw } from './editorHelpers/arrowDrawer';
import { IToolsOptions } from './toolsPanel/toolsOptions/IToolsOptions';
import {
  arrowName,
  blurName,
  commentsName,
  drawnName,
  getLayer,
  markerName,
} from './editorHelpers/editorHelper';
import {
  GlobalCompositeOperation,
  initFreeDraw,
} from './editorHelpers/freeDrawer';
import { initShapeDraw } from './editorHelpers/shapeDrawer';
import { initCrop } from './editorHelpers/cropperDrawer';
import {
  fetchEditorImage,
  uploadScreenshot,
  updateStage,
} from '@/app/services/screenshots';
import { saveOriginalWSImageData } from '@/app/services/workspace';
import { errorHandler } from '@/app/services/helpers/errors';
import browser from '@/app/utilities/browser';
import { IPencilGroupOptions } from './toolsPanel/toolsOptions/interface/IPencilGroupOptions';
import { IEmojiOptions } from './toolsPanel/toolsOptions/interface/IEmojiOptions';
import { initImageDraw } from './editorHelpers/imageDrawer';
import { initCommentsDraw } from './editorHelpers/commentsDrawer';
import { initMarkerDraw, setPosition } from './editorHelpers/markerDrawer';
import { initConversationDraw } from './editorHelpers/conversationDrawer';
import { IShapeGroupOptions } from './toolsPanel/toolsOptions/interface/IShapeGroupOptions';
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
} from './toolsPanel/toolsOptions/initialToolsSettings';
import { IMarkerOptions } from './toolsPanel/toolsOptions/interface/IMarkerGroupOptions';
import { initBlurDraw } from './editorHelpers/blurDrawer';
import { IConversationOptions } from './toolsPanel/toolsOptions/interface/IConversationOptions';
import { IWatermarkOptions } from './toolsPanel/toolsOptions/interface/IWatermarkOptions';
import { IArrowGroupOptions } from './toolsPanel/toolsOptions/interface/IArrowGroupOptions';
import { ITextOptions } from './toolsPanel/toolsOptions/interface/ITextOptions';
import { ICommentsOptions } from './toolsPanel/toolsOptions/interface/ICommentsGroupOptions';
import { getBlobfromUrl } from '@/app/utilities/images';
import AppButton from '@/content/components/controls/appButton/AppButton';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import { infoMessage } from '@/app/services/helpers/toastMessages';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IUser } from '@/app/interfaces/IUserData';
import { AppMessagesEnum, IAppMessage } from '@/app/messagess';
import { updateUserAuthAC } from '@/app/utilities/user';
import { Rect } from 'konva/lib/shapes/Rect';
import { Group } from 'konva/lib/Group';
import EditorComments from './editorHelpers/commentsPopup/EditorComments';
import MarkersContentManager from './editorHelpers/manageMarkersContent/markersContentManager';
import { IMarkerComment } from './toolsPanel/toolsOptions/interface/IMarkerComment';
import MarkerContentPopup from './editorHelpers/markersPopup/MarkerContentPopup';
import { panelRoutes } from '../../router/panelRoutes';
import { EditorService } from '@/app/services/editor/editor';
import { ToolbarService } from '@/app/services/editor/toolbar';
import { MarkerAPI } from '@/app/services/api/markers';
import { IMarker } from '@/app/interfaces/IMarker';
import { io } from 'socket.io-client';

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
  const navigateToImagesRef = useRef(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [image, setImage] = useState<IEditorImage | null>(null);
  const editorImage: IEditorImage = useSelector((state: RootStateOrAny) => {
    if (!image || state.panel.editorImage?.dbData?.id === image?.dbData?.id) {
      return state.panel.editorImage;
    }
    return image;
  });
  const activeWorkspace = useSelector(
    (state: RootStateOrAny) => state.panel.activeWorkspace,
  );
  const {
    unsavedBase64,
    capturedTitle,
    sourceUrl,
  }: { unsavedBase64: string; capturedTitle: string; sourceUrl: string } =
    useSelector((state: RootStateOrAny) => state.panel);
  const user: IUser = useSelector((state: RootStateOrAny) => state.auth.user);
  const [stage, setStage] = useState<Stage | null>(null);
  const [loadingIndicator, setLoadingIndicator] = useState<boolean>(false);
  const [stageScale, setStageScale] = useState<number>(100);
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
  const [activeTool, setActiveTool] = useState<ITool | null>(null);
  const [pointerTarget, setPointerTarget] = useState<
    Stage | Shape<ShapeConfig> | Group | null
  >(null);
  const [keyPointerTargetListener, setkeyPointerTargetListener] = useState<{
    listener: any;
  }>({ listener: null });
  const [comments, setComments] = useState<Array<IMarkerComment>>([]);
  const [cropperAreaState, setCropperAreaState] = useState<boolean>(false);
  const [pencilGroupOptions, setPencilGroupOptions] =
    useState<IPencilGroupOptions>(initPencilGroupOptions());
  const [emojiOptions, setEmojiOptions] = useState<IEmojiOptions>(
    initEmojiOptions(),
  );
  const [shapeGroupOptions, setShapeGroupOptions] =
    useState<IShapeGroupOptions>(initShapeGroupOptions());
  const [conversationOptions, setConversationOptions] =
    useState<IConversationOptions>(initConversationOptions());
  const [markerOptions, setMarkerOptions] = useState<IMarkerOptions>(
    initMarkerOptions(),
  );
  const [commentsOptions, setCommentsOptions] = useState<ICommentsOptions>(
    initCommentsOptions(),
  );
  const [watermarkOptions, setWatermarkOptions] = useState<IWatermarkOptions>(
    initWatermarkOptions(),
  );
  const [arrowGroupOptions, setArrowGroupOptions] =
    useState<IArrowGroupOptions>(initArrowGroupOptions());
  const [textOptions, setTextOptions] = useState<ITextOptions>(
    initTextOptions(),
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [stateForInitialization, setStateForInitialization] =
    useState<boolean>(false);
  const [forWorkspace, setForWorkspace] = useState(false);
  const [currentShape, setCurrentShape] = useState<
    Shape<ShapeConfig> | Group | null
  >(null);
  const [toolsOptions, setToolsOptions] = useState<IToolsOptions>({
    fillColor: 'rgba(255, 255, 255, 0)',
    strokeColor: 'rgba(0, 0, 0, 255)',
    strokeWidth: 2,
    numPoints: 5,
    innerRadius: 20,
    outerRadius: 20,
  });
  const [imageLoaded, setImageLoaded] = useState(false);

  const resetShape = () => {
    setCurrentShape(null);
  };

  const switch3D = () => {
    setPanel3D(!panel3D);
  };

  const clearActiveTool = () => {
    setActiveTool(null);
  };

  const [markers, setMarkers] = useState<IMarker[]>([]);

  const perfectScale = mainScale ? (mainScale * stageScale) / 100 : 0;

  const uploadToCloudHandler = async (name: string) => {
    ToolbarService.uploadToCloudHandler(
      name,
      setLoadingIndicator,
      stage,
      resizeDimentions,
      initialDimentions,
      stageScale,
    );
  };

  const clear = () => {
    ToolbarService.clear(stage, history, setHistory);
  };

  const cut = async () => {
    ToolbarService.cut(pointerTarget, stage);
  };

  const undo = (all = false) => {
    ToolbarService.undo(
      historyStep,
      setHistoryStep,
      renderStep,
      setUndoState,
      setCropped,
      clearActiveTool,
      all,
    );
  };

  const redo = async () => {
    await ToolbarService.redo(
      historyStep,
      history,
      setHistoryStep,
      renderStep,
      setUndoState,
      clearActiveTool,
    );
  };

  const clipboardCopy = async () => {
    await ToolbarService.clipboardCopy(
      stage,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setClipboardCopyEnabled,
      setActiveTool,
      errorHandler,
    );
  };

  const saveOriginalImageData = async (image: IEditorImage) => {
    await EditorService.saveOriginalImageData(image);
  };

  const save = async (disableNotification?: boolean) => {
    await ToolbarService.saveToDatabase(
      forWorkspace,
      activeWorkspace,
      stage,
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
      stage,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setActiveTool,
      editorImage,
      'pdf',
    );
  };

  const pngSave = async () => {
    await ToolbarService.saveImageAs(
      stage,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setActiveTool,
      editorImage,
      'png',
    );
  };

  const jpgSave = async () => {
    await ToolbarService.saveImageAs(
      stage,
      resizeDimentions,
      initialDimentions,
      stageScale,
      setActiveTool,
      editorImage,
      'jpg',
    );
  };

  const saveHistory = async (resizer?: ISize, newStage?: any) => {
    if (historyStep === -1) {
      clear();
    }
    setUndoState(true);
    const img = editorImage.url;
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
        EditorService.selectLastChild(stage, setPointerTarget, setCurrentShape);
      }
    }
  };

  const renderStep = (step: number) => {
    if (history.length > 0) {
      setResizeDimentions(history[step]?.renderDimentions);
    }

    const newStage = Konva.Node.create(history[step].stage, 'stage');
    const background = newStage?.findOne('#main');

    background.fillPatternImage(originalImageSourceRef.current);
    stage?.destroy();

    EditorService.reRenderElements(
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
    setCurrentShape(null);
  };

  const keyPointerTargetListenerInstance = (e: KeyboardEvent) => {
    EditorService.keyPointerTargetListenerInstance(
      e,
      stage,
      pointerTarget,
      markerOptions,
      setPointerTarget,
      saveHistory,
    );
  };

  const pointerEventListener = (e: KonvaEventObject<MouseEvent>) => {
    EditorService.checkShapeType(
      e.target,
      setCurrentShape,
      dispatch,
      shapeGroupOptions,
      setShapeGroupOptions,
      conversationOptions,
      setConversationOptions,
      markerOptions,
      setMarkerOptions,
      commentsOptions,
      setCommentsOptions,
      pencilGroupOptions,
      setPencilGroupOptions,
      textOptions,
      setTextOptions,
      arrowGroupOptions,
      setArrowGroupOptions,
    );
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
          className="!tw-z-2000 tw-absolute "
          style={{ transition: '0.05s', zIndex: '99' }}
        >
          <div className="tw-w-28 tw-font-semibold tw-font-sans tw-flex tw-flex-col tw-p-10px tw-bg-toolbox-light tw-rounded-5 tw-text-xs ">
            <AppButton
              onClick={() => {
                ToolbarService.onCropHandler(
                  stage,
                  setResizeDimentions,
                  saveHistory,
                  setCropped,
                  clearActiveTool,
                );
              }}
              className="tw-pl-1 tw-pr-1 tw-pt-1px tw-pb-1px tw-mb-2 tw-rounded-2xl "
              full
            >
              <div className="tw-text-xs tw-m-2px"> Crop</div>
            </AppButton>

            <AppButton
              onClick={() => setActiveTool(null)}
              bgColor="tw-bg-app-grey-darker"
              className="tw-pl-1 tw-pr-1 tw-pt-1px tw-pb-1px tw-border-app-grey tw-rounded-2xl "
              full
              outlined
            >
              <div className="tw-text-xs tw-m-2px">Cancel</div>
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
    const scaleCoefficient = stageScale / 100;

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
      const scale = Math.max(scaleX, scaleY);
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
    if (cropped || image?.dbData?.stage?.cropped) {
      infoMessage('We are working hard to make the cropped image resizable');
    }
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
      shape.fontFamily(options.fontFamily);
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

  useEffect(() => {
    const allComments = markers.flatMap((marker) => marker.comments);
    setComments(allComments);
    // Connect to your server
    const socket = io('http://localhost:3000', { transports: ['websocket'] });

    // Listen for 'connect' event
    socket.on('connect', () => {
      console.info('Successfully connected to the websocket');
    });

    // Listen for 'markers-updated' event
    socket.on('markers-updated', (data: any) => {
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
      PanelAC.setCurrentTool({ name: tools.pointer.title, clicked: true }),
    );
    setActiveTool(tools.pointer);
    return () => {
      document.title = 'Rec';
    };
  }, []);

  // This effect also gets called if another Editor is opened
  useEffect(() => {
    const processImage = async () => {
      const id =
        searchParams.get('id') || editorImage?.dbData?.id || image?.dbData?.id;
      const workspaceId = searchParams.get('workspaceId'); // This is workspace image

      if (workspaceId) {
        setForWorkspace(true);
      }

      // Fetch image
      if (id) {
        setStateForInitialization(true);
        setLoadingIndicator(false);

        const fetchedImage = workspaceId
          ? await fetchEditorImage(id, workspaceId as string)
          : await fetchEditorImage(id);

        if (!fetchedImage) {
          setLoadingIndicator(true);
          console.log('Could not fetch image.');
          return;
        }

        setImage(fetchedImage);
        setLoadingIndicator(true);
        setImageLoaded(true);
        return;
      }

      // Set image data if new image has been created, clicked...
      if (editorImage && !image) {
        setImage(editorImage);
      }
    };

    !imageLoaded && processImage();
  }, [searchParams, imageLoaded, editorImage]);

  useEffect(() => {
    if (!image) return;

    const innerImage = new Image();
    innerImage.src = image.dbData?.originalImage
      ? image.dbData?.originalImage
      : image.url;

    originalImageSourceRef.current = innerImage;

    innerImage.onload = async function () {
      const stage = new Konva.Stage({
        container: 'stage',
        /* width:
							image.width < window.innerWidth ? image.width : window.innerWidth, */
        width:
          innerImage.width < window.innerWidth
            ? innerImage.width
            : window.innerWidth,
        /*  height:
							image.height < window.innerWidth ? image.height : window.innerWidth, */
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

      backgroundImage.on('click', () => {
        setPointerTarget(null);
        destroyPointerTransformer(stage);
        resetShape();
      });

      // Set the stage width, height, scale and initialDimentions
      const width = stage.width();
      const height = stage.height();
      const imageWidth = backgroundImage.fillPatternImage().width || width;
      const imageHeight = backgroundImage.fillPatternImage().height || height;

      const scaleX = width / imageWidth;
      const scaleY = height / imageHeight;
      const scale = Math.max(scaleX, scaleY);

      stage.height(backgroundImage.height());
      setMainScale(scale);
      setInitialDimentions({
        width: innerImage.width,
        height: innerImage.height,
      });
      /*  backgroundImage.fillPatternScaleX(scale);
					backgroundImage.fillPatternScaleY(scale); */

      const mainLayer = new Konva.Layer({ id: 'mainLayer' });
      mainLayer.add(stageBackground);
      stage.add(mainLayer);
      mainLayer.draw();

      const drawLayer = new Konva.Layer({ id: 'drawLayer' });
      drawLayer.add(backgroundImage);
      stage.add(drawLayer);
      drawLayer.draw();

      const commentsLayer = new Konva.Layer({ id: 'commentsLayer' });
      stage.add(commentsLayer);
      commentsLayer.draw();

      if (image.dbData?.stage) {
        EditorService.renderStage(
          editorImage,
          originalImageSourceRef,
          stage,
          setResizeDimentions,
          setStage,
          setLoadingIndicator,
          saveHistory,
          setCurrentShape,
          activeTool,
          markerOptions,
          setPointerTarget,
          resetShape,
          stageScale,
          setMarkers,
          activeWorkspace,
          forWorkspace,
        );
        return;
      }

      setLoadingIndicator(true);
      setStage(stage);
    };

    if (editorImage?.dbData?.markers) {
      setMarkers(JSON.parse(editorImage.dbData.markers));
    }
  }, [image]);

  useEffect(() => {
    if (image && !image?.dbData?.originalImage && image?.dbData?.refName) {
      !activeWorkspace && !forWorkspace
        ? saveOriginalImageData(image)
        : saveOriginalWSImageData(
            activeWorkspace?.id,
            image?.dbData?.refName,
            image,
          );
    }
  }, [image, activeWorkspace, forWorkspace]);

  useEffect(() => {
    const listener = async (message: IAppMessage) => {
      if (message.action === AppMessagesEnum.saveImage) {
        const updateUser = async () => {
          await updateUserAuthAC();
        };
        updateUser();
        navigateToImagesRef.current = true;
      }
      return true;
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [user]);

  // This effect fires from changes in Redux.
  // "openImageEditor" has fired with data for new image;
  useEffect(() => {
    if (!unsavedBase64.length || imageLoaded) return;

    if (user) {
      setStateForInitialization(true);

      uploadScreenshot(unsavedBase64).then((editorImage) => {
        const id = editorImage?.dbData?.id;
        id && setSearchParams({ id });
        setImageLoaded(true);
      });

      navigateToImagesRef.current && navigate(panelRoutes.images.path);
    } else {
      const createImage = async () => {
        const blob: Blob | null = await getBlobfromUrl(unsavedBase64);
        const url = URL.createObjectURL(blob);
        const editorImage: IEditorImage = {
          url,
        };

        dispatch(PanelAC.setEditorImage({ editorImage }));
      };

      createImage();
    }
  }, [unsavedBase64, imageLoaded, user]);

  useEffect(() => {
    if (stage && !initStage) {
      !editorImage.dbData?.stage && saveHistory();
      setInitStage(true);
    }
  }, [stage, initStage]);

  useEffect(() => {
    if (history.length && activeTool) {
      setActiveTool(Object.assign({}, activeTool));
    }
  }, [history]);

  useEffect(() => {
    stage &&
      EditorService.changeCursor(
        stage,
        activeTool,
        emojiOptions,
        stageScale,
        markerOptions,
        conversationOptions,
        shapeGroupOptions,
      );
    stage && destroyPointerTransformer(stage);
    stage && destroyAnchor(stage);
    stage && EditorService.toggleShapesActivity(stage, activeTool);
    setPointerTarget(null);
  }, [activeTool?.tool]);

  useEffect(() => {
    stage &&
      EditorService.changeCursor(
        stage,
        activeTool,
        emojiOptions,
        stageScale,
        markerOptions,
        conversationOptions,
        shapeGroupOptions,
      );
  }, [shapeGroupOptions]);

  useEffect(() => {
    EditorService.clearStageSettings(stage, setCropperAreaState);
    EditorService.setStageSettings(stage, pointerEventListener);

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
            text: user.displayName ? user.displayName[0].toUpperCase() : '',
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
            text: user.displayName ? user.displayName[0].toUpperCase() : '',
          },
          shapeType: tools.comments.tool,
          saveHistory,
        });

      compareTools(activeTool, tools.blur) &&
        mainScale &&
        initBlurDraw({ stage, stageScale, saveHistory, mainScale, resized });

      compareTools(activeTool, tools.undo);
      compareTools(activeTool, tools.redo);
      compareTools(activeTool, tools.clear);
      // compareTools(activeTool, tools.watermark);
    }
  }, [activeTool]);

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

  useEffect(() => {
    const scaleCoefficient = stageScale / 100;
    const { width, height } =
      resizeDimentions.height === 0 && resizeDimentions.width === 0
        ? initialDimentions
        : resizeDimentions;
    if (stage && mainScale) {
      stage.height(height * mainScale * scaleCoefficient);
      stage.width(width * mainScale * scaleCoefficient);
      stage.scaleX(mainScale * scaleCoefficient);
      stage.scaleY(mainScale * scaleCoefficient);
    }
    if (
      currentShape?.attrs.shapeType === tools.marker.tool &&
      stage &&
      currentShape
    ) {
      //@ts-ignore
      setPosition(stage, currentShape);
    }
  }, [stageScale, stage, resizeDimentions]);

  useEffect(() => {
    if (resizerState) {
      setResized(true);
      resizer();
      saveHistory(resizerState);
    }
  }, [resizerState]);

  useEffect(() => {
    if (activeTool?.tool === tools.marker.tool) {
      stage && EditorService.replaceMarkers(stage, markerOptions, stageScale);
    }
  });

  useEffect(() => {
    if (activeTool?.tool === tools.emoji.tool) {
      stage && EditorService.replaceEmoji(stage, emojiOptions, stageScale);
    }
  }, [emojiOptions.url]);

  useEffect(() => {
    if (activeTool?.tool === tools.conversation.tool) {
      stage && EditorService.replaceConversation(stage, conversationOptions);
    }
  }, [conversationOptions.filename, conversationOptions]);

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

    const handleChange = (event: KeyboardEvent) => {
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
      if (e.keyCode === 27) {
        setActiveTool(null);
        // EditorService.toggleMarkerPopup(false);
      }
    });
  }

  return (
    <div
      className="tw-relative tw-min-h-screen leak-bg tw-flex tw-items-center "
      style={{
        backgroundImage: `url(${browser.runtime.getURL(
          '/images/panel/images/leak_bg.jpg)',
        )}`,
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
          markerOptions={markerOptions}
          onMarkerOptionsChange={setMarkerOptions}
          commentsOptions={commentsOptions}
          onCommentsOptionsChange={setCommentsOptions}
          watermarkOptions={watermarkOptions}
          arrowGroupOptions={arrowGroupOptions}
          onTextOptionsChange={setTextOptions}
          onEmojiOptionsChange={setEmojiOptions}
          onShapeGroupOptionsChange={setShapeGroupOptions}
          onConversationOptionsChange={setConversationOptions}
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
          history={history}
          stateForInitialization={stateForInitialization}
          editorImage={editorImage}
          workspace={forWorkspace && activeWorkspace}
          setLoading={setLoadingIndicator}
        />
      )}

      <div
        className="z-50 tw-relative"
        style={{
          height: '97vh',
        }}
      >
        {currentShape?.attrs.shapeType === tools.marker.tool ? (
          <MarkerContentPopup
            user={user}
            markerOptions={markerOptions}
            currentShape={currentShape}
            scale={stageScale}
            comments={comments}
            setMarkers={setMarkers}
            editorImage={editorImage}
            markers={markers}
            activeWorkspace={activeWorkspace}
            forWorkspace={forWorkspace}
          />
        ) : (
          <></>
        )}{' '}
      </div>

      <div
        id="stage"
        className=" tw-flex tw-items-start tw-justify-center tw-relative tw-scrollbar-thin tw-scrollbar-thumb-gray-400 tw-scrollbar-track-gray-100 tw-scrollbar-thumb-rounded-full tw-scrollbar-track-rounded-full"
        style={{
          height: '97vh',
        }}
      >
        {renderCropBar()}
      </div>

      <MarkersContentManager
        user={user}
        commentsOptions={commentsOptions}
        onCommentsOptionsChange={setCommentsOptions}
        currentShape={currentShape}
        scale={stageScale}
        comments={comments}
      />
      {/* <MarkerContentPopup
        user={user}
        markerOptions={markerOptions}
        onCommentsOptionsChange={setCommentsOptions}
        currentShape={currentShape}
        scale={stageScale}
        comments={comments}
        addComment={addComment}
      /> */}
      <AppSpinner show={!loadingIndicator} tip="Loading image..." />
    </div>
  );
};

export default EditorScreen;
