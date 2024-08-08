import React, { useCallback, useEffect, useState } from 'react';
import AppButton from '@/content/components/controls/appButton/AppButton';
import 'clipboard-polyfill/overwrite-globals';
import ToolBtn from './ToolBtn/ToolBtn';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { Stage } from 'konva/lib/Stage';
import { Select, Tabs } from 'antd';
import { compareTools, ITool, tools } from './tools';
import { IToolsOptions } from './toolsOptions/IToolsOptions';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Logo from '@/content/components/elements/Logo';
import './ToolsPanel.scss';
import { useNavigate } from 'react-router';
import { panelRoutes } from '@/content/panel/router/panelRoutes';
import Draggable from 'react-draggable';
import ToolsRow from './ToolsRow';
import ToolsColumn from './ToolsColumn';
import ToolSubPanelBtn from './ToolBtn/components/ToolSubPanelBtn';
import ColorSelector from './toolsOptions/ColorSelector';
import StrokeWidthSelector from './toolsOptions/strokeWidthSelector/StrokeWidthSelector';
import { IPencilGroupOptions } from './toolsOptions/interface/IPencilGroupOptions';
import { IEmojiOptions } from './toolsOptions/interface/IEmojiOptions';
import { IMarkerOptions } from './toolsOptions/interface/IMarkerGroupOptions';
import classNames from 'classnames';
import { IShapeGroupOptions } from './toolsOptions/interface/IShapeGroupOptions';
import { IConversationOptions } from './toolsOptions/interface/IConversationOptions';
import { conversationData } from '@/app/utilities/conversation.data';
import WatermarkToolBtn from './ToolBtn/customToolBtn/WatermarkToolBtn/WatermarkToolBtn';
import CommentsTool from './ToolBtn/customToolBtn/CommentsToolBtn/CommentsTool';
import SavingTool from './ToolBtn/customToolBtn/SavingToolBtn/SavingToolBtn';

import { IWatermarkOptions } from './toolsOptions/interface/IWatermarkOptions';
import ArrowTool from './ToolBtn/customToolBtn/ArrowToolBtn/ArrowTool';
import { IArrowGroupOptions } from './toolsOptions/interface/IArrowGroupOptions';
import { ITextOptions } from './toolsOptions/interface/ITextOptions';
import TextTool from './ToolBtn/customToolBtn/TextToolBtn/TextTool';
import { Shape } from 'konva/lib/Shape';
import ResizeTool from './ToolBtn/customToolBtn/ResizeTool/ResizeTool';
import EraserTool from './ToolBtn/customToolBtn/EraserTool/EraserTool';
import MarkerTool from './ToolBtn/customToolBtn/MarkersToolBtn/MarkerTool';
import SendEmailTool from './ToolBtn/customToolBtn/SendEmailTool/SendEmailTool';
import AppNumberSelector from '@/content/components/controls/appNumberSelector/AppNumberSelector';
import { getBlobFromStage } from '../editorHelpers/utils';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import '@/content/panel/screens/editorScreen/toolsPanel/ToolsPanel.scss';
import '@/content/popup/assets/conversationtoolPopup.scss';
import IconBtn from './ToolBtn/components/IconBtn';
import useEditorVideo from '../../../hooks/useEditorVideo';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

//Icons

import cutIcon from '@/content/assests/svg/tools-panel/cut.svg';
import textStrokeIcon from '@/content/assests/svg/tools-panel/T(Stroke).svg';
import FillTIcon from '@/content/assests/svg/tools-panel/T(Fill).svg';
import fullFillerIcon from '@/content/assests/svg/tools-panel/fullfiller.svg';
import copyIcon from '@/content/assests/svg/tools-panel/copy.svg';
import close from '@/content/assests/svg/tools-panel/close.svg';
import pin_lock from '@/content/assests/svg/tools-panel/pin_lock.svg';
import pin_lock_black from '@/content/assests/svg/tools-panel/pin_lock_black.svg';
import collapse_close from '@/content/assests/svg/tools-panel/collapse_close.svg';
import expand_open from '@/content/assests/svg/tools-panel/expand_open.svg';
import ds from '@/content/assests/svg/tools-panel/ds.svg';
import { IUser } from '@/app/interfaces/IUserData';
import SendSlackTool from './ToolBtn/customToolBtn/SendSlackTool/SendSlackTool';
import PanelSplitter from './PanelSplitter';
import { createLoginTab } from '@/content/utilities/scripts/manageLoginTabs';
import { blobToDataURL } from '@/app/utilities/images';
import IEditorImage from '@/app/interfaces/IEditorImage';
import SendWhatsAppTool from './ToolBtn/customToolBtn/SendWhatsAppTool/SendWhatsAppTool';
import { Emoji } from 'emoji-mart/dist-es/utils/data';
import { ICommentsOptions } from './toolsOptions/interface/ICommentsGroupOptions';
import ShareTool from './ToolBtn/customToolBtn/ShareToolBtn/ShareToolBtn';
import { IWorkspace } from '@/app/interfaces/IWorkspace';
import { Group } from 'konva/lib/Group';
import { init } from 'emoji-mart';
init({ data });

const fonts: string[] = [
  'Times New Roman',
  'Arial',
  'Craft Girls',
  'Limelight',
  'Roboto',
  'Octavia',
  'Avenir Next Cyr',
  'Puppies Play',
  'Yellowtail',
  'Abhaya Libre',
  'Yellowtail',
  'Oswald',
  'Bebas Neue',
  'Leckerli One',
  'Lobster',
  'Berkshire Swash',
  'Stalemate',
  'Style Script',
  'Marker Felt',
  'Righteous',
  'Rochester',
  'Lato',
  'Rasa',
  'Laila',
];

interface IToolsPanelProps {
  stage: Stage;
  stageScale: number;
  onSaveHistory: () => void;
  onUndo: (all?: boolean) => void;
  onRedo: () => void;
  onCut: () => void;
  onSave: () => void;
  clipboardCopyEnabled: boolean;
  clipboardCopy: () => void;
  onSaveAsPDF: () => void;
  onSaveAsPNG: () => void;
  onSaveAsJPG: () => void;
  onUploadToDrive: (name: string) => void;
  oldName: string;
  onResetShape: () => void;
  onToolChange: (tool: ITool | null) => void;
  activeTool: ITool | null;
  pointerTarget: Stage | Shape | Group | null;
  initialDimentions: { width: number; height: number };
  resizeDimentions: { width: number; height: number };
  canUndo: boolean;
  canRedo: boolean;
  toolsOptions: IToolsOptions;
  onToolsOptionsChange: (options: IToolsOptions) => void;
  textOptions: ITextOptions;
  onTextOptionsChange: (options: ITextOptions) => void;
  user?: IUser;
  pencilGroupOptions: IPencilGroupOptions;
  emojiOptions: IEmojiOptions;
  conversationOptions: IConversationOptions;
  markerOptions: IMarkerOptions;
  commentsOptions: ICommentsOptions;
  shapeGroupOptions: IShapeGroupOptions;
  watermarkOptions: IWatermarkOptions;
  arrowGroupOptions: IArrowGroupOptions;
  onPencilGroupOptionsChange: (options: IPencilGroupOptions) => void;
  onMarkerOptionsChange: (options: IMarkerOptions) => void;
  onCommentsOptionsChange: (options: ICommentsOptions) => void;
  onEmojiOptionsChange: (options: IEmojiOptions) => void;
  onShapeGroupOptionsChange: (options: IShapeGroupOptions) => void;
  onConversationOptionsChange: (options: IConversationOptions) => void;
  onWatermarkOptionsChange: (options: IWatermarkOptions) => void;
  onArrowGroupOptionsChange: (options: IArrowGroupOptions) => void;
  onStageScaleChange: (scale: number) => void;
  onResize: (width: number, height: number) => void;
  panel3D?: boolean;
  switch3D: () => void;
  capturedTitle: string;
  sourceUrl: string;
  history: any;
  stateForInitialization: boolean;
  editorImage: IEditorImage;
  workspace?: IWorkspace;
  setLoading: (imageLoaded: boolean) => void;
}

const ToolsPanel: React.FC<IToolsPanelProps> = ({
  onSaveHistory,
  onUndo,
  onRedo,
  onCut,
  onSave,
  clipboardCopyEnabled,
  clipboardCopy,
  onToolChange,
  stage,
  stageScale,
  initialDimentions,
  resizeDimentions,
  activeTool,
  pointerTarget,
  canUndo,
  canRedo,
  toolsOptions,
  onToolsOptionsChange,
  textOptions,
  onTextOptionsChange,
  user,
  pencilGroupOptions,
  emojiOptions,
  markerOptions,
  onMarkerOptionsChange,
  commentsOptions,
  onCommentsOptionsChange,
  shapeGroupOptions,
  conversationOptions,
  watermarkOptions,
  arrowGroupOptions,
  onPencilGroupOptionsChange,
  onEmojiOptionsChange,
  onShapeGroupOptionsChange,
  onConversationOptionsChange,
  onWatermarkOptionsChange,
  onArrowGroupOptionsChange,
  onStageScaleChange,
  onResize,
  onSaveAsPDF,
  onSaveAsPNG,
  onSaveAsJPG,
  onResetShape,
  onUploadToDrive,
  oldName,
  panel3D,
  switch3D,
  capturedTitle,
  sourceUrl,
  history,
  stateForInitialization,
  editorImage,
  workspace,
  setLoading,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { TabPane } = Tabs;
  const fromExisted: string = useSelector(
    (state: RootStateOrAny) => state.panel.fromExisted,
  );
  const [locked, setLocked] = useState<boolean>(true);
  const [show, setShow] = useState<boolean>(false);

  const {
    recordingIcon,
    recordingStatus,
    stopVideo,
    startVideo,
    setRecordingStatus,
    resumeVideo,
  } = useEditorVideo();

  const selectResizeToolHandler = () => {
    onToolChange(tools.resize);
  };

  const resizeHandler = (width: number, height: number) => {
    //closeResizeTool();
    onResize(width, height);
  };

  const closeResizeTool = () => {
    compareTools(activeTool, tools.resize) && onToolChange(null);
  };

  const isActive = (tool: ITool): boolean => compareTools(activeTool, tool);

  const activateCircle = (e: CheckboxChangeEvent) => {
    onToolChange(e.target.checked ? tools.circle : tools.elipse);
  };

  const pencilGroupOptionsChangeHandler = (field: string, value: any) => {
    onPencilGroupOptionsChange({ ...pencilGroupOptions, [field]: value });
  };

  const shapeGroupOptionsChangeHandler = (field: string, value: any) => {
    onShapeGroupOptionsChange({ ...shapeGroupOptions, [field]: value });
  };

  const conversationOptionsChangeHandler = (field: string, value: any) => {
    onConversationOptionsChange({ ...conversationOptions, [field]: value });
  };

  const saveScreenshot = async (): Promise<void> => {
    try {
      if (recordingStatus != 'stop') {
        stopVideo();
      }
      if (user) {
        await onSave();
        navigate(
          workspace
            ? `${panelRoutes.workspace.path}?workspaceId=${workspace.id}`
            : panelRoutes.images.path,
        );
      } else {
        await saveImageAndCreateLoginTab();
      }
      dispatch(PanelAC.resetExplorerDataLoader());
    } catch (error: any) {
      console.log(error);
    }
  };

  const saveImageAndCreateLoginTab = async () => {
    const blob = await getBlobFromStage(stage, initialDimentions, stageScale);
    const newBase64: string = await blobToDataURL(blob);

    dispatch(
      PanelAC.setUnsavedBase64({
        unsavedBase64: newBase64,
        capturedTitle,
        sourceUrl,
      }),
    );

    const url = URL.createObjectURL(blob);
    const editorImage: IEditorImage = {
      url,
    };

    dispatch(PanelAC.setEditorImage({ editorImage }));

    await createLoginTab(false, false, true);
  };

  const onCancelHandler = () => {
    if (recordingStatus != 'stop') {
      stopVideo();
    }
    window.history.length > 1
      ? navigate(
          workspace
            ? `${panelRoutes.workspace.path}?workspaceId=${workspace.id}`
            : panelRoutes.images.path,
        )
      : window.close();
  };

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const handleStop = (event: any, dragElement: any) => {
    setX(dragElement.x);
    setY(dragElement.y);
  };

  const onVideoRecordHandler = async () => {
    onToolChange(tools.video);
    if (user) {
      if (recordingStatus == 'stop') {
        startVideo();
      } /* else if (recordingStatus == 'pause') {
        resumeVideo();
      } */
    } else {
      await saveImageAndCreateLoginTab();
    }
  };

  useEffect(() => {
    dispatch(PanelAC.setToolPanelPosition(x, y));
  }, [x, y]);

  useEffect(() => {
    onResetShape();
    onToolChange(tools.pointer);
  }, []);

  const activeShapeTool = useCallback((): ITool => {
    return (
      ([
        tools.elipse,
        tools.rect,
        tools.star,
        tools.triangle,
        tools.heart,
        tools.square,
        tools.comment,
        tools.blob,
      ].some((tool) => compareTools(activeTool, tool))
        ? activeTool
        : tools.elipse) || tools.elipse
    );
  }, [activeTool]);

  const currentTool: any = useSelector(
    (state: RootStateOrAny) => state.panel.currentTool,
  );

  const selectEmoji = async (selection: any) => {
    stage.container().style.cursor = 'wait';
    const response = await fetch(
      `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${selection.unified}.svg`,
    );

    onEmojiOptionsChange({
      id: selection.id,
      filename: selection.name,
      url:
        response.status === 200
          ? `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${selection.unified}.svg`
          : `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${
              selection.unified.split('-')[0]
            }.svg`,
      emoji: selection.native,
    });
    onToolChange(tools.emoji);
  };

  return (
    <Draggable onStop={handleStop} position={{ x: x, y: y }} disabled={locked}>
      <div
        className={classNames(
          ` tools-panel-wrapper tw-fixed tw-z-10 tw-left-4 tw-rotate-90 tw-flex tw-flex-col tw-justify-between 
        tw-bg-toolbox-light tw-rounded-2lg tw-shadow-2xl tw-select-none 
        `,
        )}
      >
        <div className=" tw-flex  tw-pt-1 tw-px-1 tw-bg-trans tw-justify-end tw-items-start tw-content-end ">
          {!locked ? (
            <div className="toolbtn-flat-small">
              <IconBtn
                size="10px"
                icon={pin_lock}
                onSelect={() => {
                  setLocked(true);
                }}
              />
            </div>
          ) : (
            <div className="toolbtn-flat-small">
              <IconBtn
                size="10px"
                icon={pin_lock_black}
                onSelect={() => {
                  setLocked(false);
                }}
              />
            </div>
          )}
          <div className="toolbtn-flat-small  tw-ml-4px">
            <IconBtn
              size="10px"
              icon={close}
              onSelect={() => {
                onCancelHandler();
              }}
            />
          </div>
        </div>
        <div className="tool-box-start">
          <div
            onClick={() => switch3D()}
            className="tw-relative tw-select-none tw-mb-1   tw-px-1 "
          >
            <Logo
              type="default"
              className="tw-w-full tw-mb-2px tw-scale-100  "
            />
            <div className="tw-absolute tw-top-0 tw-left-0 tw-w-full tw-h-full"></div>
          </div>{' '}
          <ToolsColumn>
            <ToolBtn
              toolTitle={tools.video.title}
              large={true}
              panel3D={panel3D}
              isOpenEditTool={false}
              onSelect={onVideoRecordHandler}
              icon={recordingIcon}
              active={isActive(tools.video)}
              disabled={
                recordingStatus == 'resume' || recordingStatus == 'pause'
              }
            />

            <MarkerTool
              options={markerOptions}
              isOpenEditTool={currentTool?.name == 'marker' ? true : false}
              active={isActive(tools.marker)}
              onToolChange={onToolChange}
              onResetShape={onResetShape}
              title="marker"
              onChange={onMarkerOptionsChange}
            />

            <TextTool
              isOpenEditTool={currentTool?.name == 'text' ? true : false}
              options={textOptions}
              active={isActive(tools.text)}
              onChange={onTextOptionsChange}
              onToolChange={onToolChange}
              onResetShape={onResetShape}
              title="text"
            />
            <ArrowTool
              isOpenEditTool={currentTool?.name == 'arrow' ? true : false}
              title="arrow"
              options={arrowGroupOptions}
              activeTool={activeTool}
              onChange={onArrowGroupOptionsChange}
              onToolChange={onToolChange}
              onResetShape={onResetShape}
            />

            {!show ? (
              <div className="toolbtn-flat-small tw-mt-3px">
                <IconBtn
                  size="10px"
                  icon={collapse_close}
                  onSelect={() => {
                    setShow(true);
                  }}
                />
              </div>
            ) : (
              <div className="toolbtn-flat-small tw-mt-3px">
                <IconBtn
                  size="10px"
                  icon={expand_open}
                  onSelect={() => {
                    setShow(false);
                  }}
                />
              </div>
            )}
            <img src={ds} style={{ userSelect: 'none' }} alt="" />
          </ToolsColumn>
        </div>

        <div className={`${show ? 'tw-h-0px tw-overflow-hidden ' : ''}`}>
          <ToolsRow>
            <ResizeTool
              isOpenEditTool={currentTool?.name == 'resize' ? true : false}
              onSelect={onToolChange}
              active={isActive(tools.resize)}
              initialWidth={stage.width()}
              initialHeight={stage.height()}
              onResize={resizeHandler}
            />

            <ToolBtn
              panel3D={panel3D}
              isOpenEditTool={false}
              onSelect={() => onToolChange(tools.crop)}
              icon={tools.crop.icon}
              active={isActive(tools.crop)}
              toolTitle={tools.crop.title}
              placement="right"
            />
          </ToolsRow>
          {/* <PanelSplitter /> */}
          <ToolsRow>
            <ToolBtn
              panel3D={panel3D}
              isOpenEditTool={false}
              onSelect={() => onToolChange(tools.pointer)}
              icon={tools.pointer.icon}
              active={isActive(tools.pointer)}
              toolTitle={tools.pointer.title}
            />

            <EraserTool
              isOpenEditTool={currentTool?.name == 'eraser' ? true : false}
              onToolChange={onToolChange}
              active={isActive(tools.eraser)}
              options={pencilGroupOptions}
              onChange={onPencilGroupOptionsChange}
              onResetShape={() => {
                onResetShape();
                onPencilGroupOptionsChange({
                  strokeWidth: pencilGroupOptions.strokeWidth,
                  strokeColor: 'rgb(0,0,0)',
                });
              }}
            />
          </ToolsRow>
          <ToolsRow>
            <ToolBtn
              panel3D={panel3D}
              isOpenEditTool={currentTool?.name == 'free' ? true : false}
              title="free"
              toolTitle={tools.roller.title}
              onSelect={() => {
                onToolChange(
                  isActive(tools.roller) ? tools.roller : tools.pencil,
                );
                onResetShape();
                if (!isActive(tools.pencil) && !isActive(tools.roller)) {
                  onPencilGroupOptionsChange({
                    strokeWidth: 2,
                    strokeColor: 'rgb(0,0,0)',
                  });
                }
              }}
              icon={
                isActive(tools.roller) ? tools.roller.icon : tools.pencil.icon
              }
              active={isActive(tools.pencil) || isActive(tools.roller)}
            >
              <div>
                <div className="tw-flex tw-mb-4 tw-justify-center ">
                  <ToolSubPanelBtn
                    onSelect={() => {
                      onToolChange(tools.pencil);
                      onResetShape();
                      onPencilGroupOptionsChange({
                        strokeWidth: 2,
                        strokeColor: 'rgb(0,0,0)',
                      });
                    }}
                    icon={tools.pencil.icon}
                    active={isActive(tools.pencil)}
                    toolTitle={tools.pencil.title}
                  />

                  <ToolSubPanelBtn
                    icon={tools.roller.icon}
                    active={isActive(tools.roller)}
                    onSelect={() => {
                      onToolChange(tools.roller);
                      onResetShape();
                      onPencilGroupOptionsChange({
                        strokeWidth: 6,
                        strokeColor: 'rgba(0,0,0,0.5)',
                      });
                    }}
                    toolTitle={tools.roller.title}
                  />
                </div>

                <div className="tw-flex tw-justify-center">
                  <ColorSelector
                    color={pencilGroupOptions.strokeColor}
                    onChange={(val) =>
                      pencilGroupOptionsChangeHandler('strokeColor', val)
                    }
                    className="tw-mr-2"
                  />

                  <StrokeWidthSelector
                    tool={
                      pencilGroupOptions.strokeWidth >= 32 ||
                      String(activeTool?.tool) === 'roller'
                        ? 'roller'
                        : 'pencil'
                    }
                    width={pencilGroupOptions.strokeWidth}
                    onChange={(val) =>
                      pencilGroupOptionsChangeHandler('strokeWidth', val)
                    }
                  />
                </div>
              </div>
            </ToolBtn>

            <ToolBtn
              isOpenEditTool={currentTool?.name == 'emoji' ? true : false}
              title="emoji"
              toolTitle={tools.emoji.title}
              onSelect={() => onToolChange(tools.emoji)}
              icon={tools.emoji.icon}
              active={isActive(tools.emoji)}
              placement="right"
              toolSubPanelClasses="tw-flex tw-flex-wrap  tw-bg-toolbox-light tw-px-2px tw-py-4px"
              // loadingFunction={loadPicker}
            >
              <div id="pickerContainer">
                <Picker
                  color={'#eb3507'}
                  data={data}
                  autofocus={true}
                  icons={'solid'}
                  perLine={5}
                  maxFrequentRows={5}
                  emojiSize={40}
                  emojiButtonRadius={'1rem'}
                  emojiButtonSize={65}
                  emojiButtonColors={['rgb(54, 46, 114)']}
                  onEmojiSelect={(emoji: Emoji) => selectEmoji(emoji)}
                  previewEmoji={emojiOptions.id}
                />
              </div>
            </ToolBtn>
          </ToolsRow>
          <ToolsRow>
            <ToolBtn
              isOpenEditTool={currentTool?.name == 'figure' ? true : false}
              title="figure"
              toolTitle="Shapes"
              onSelect={() => {
                onToolChange(activeShapeTool());
                onResetShape();
              }}
              icon={activeShapeTool().icon}
              active={isActive(activeShapeTool())}
            >
              <div>
                <div className="tw-flex tw-mb-4 tw-justify-center ">
                  <ToolSubPanelBtn
                    onSelect={() => {
                      onResetShape();
                      onToolChange(tools.elipse);
                    }}
                    icon={tools.elipse.icon}
                    active={isActive(tools.elipse)}
                    toolTitle={tools.elipse.title}
                  />

                  <ToolSubPanelBtn
                    icon={tools.square.icon}
                    active={isActive(tools.square)}
                    onSelect={() => {
                      onResetShape();
                      onToolChange(tools.square);
                    }}
                    toolTitle={tools.square.title}
                  />

                  <ToolSubPanelBtn
                    icon={tools.blob.icon}
                    active={isActive(tools.blob)}
                    onSelect={() => {
                      onResetShape();
                      onToolChange(tools.blob);
                    }}
                    toolTitle={tools.blob.title}
                  />

                  <ToolSubPanelBtn
                    icon={tools.triangle.icon}
                    active={isActive(tools.triangle)}
                    onSelect={() => {
                      onResetShape();
                      onToolChange(tools.triangle);
                    }}
                    toolTitle={tools.triangle.title}
                  />
                </div>

                <div className="tw-flex tw-mb-4 tw-justify-center">
                  <ToolSubPanelBtn
                    icon={tools.star.icon}
                    active={isActive(tools.star)}
                    onSelect={() => {
                      onResetShape();
                      onToolChange(tools.star);
                    }}
                    toolTitle={tools.star.title}
                  />

                  <ToolSubPanelBtn
                    icon={tools.heart.icon}
                    active={isActive(tools.heart)}
                    onSelect={() => {
                      onResetShape();
                      onToolChange(tools.heart);
                    }}
                    toolTitle={tools.heart.title}
                  />

                  <ToolSubPanelBtn
                    icon={tools.rect.icon}
                    active={isActive(tools.rect)}
                    onSelect={() => {
                      onResetShape();
                      onToolChange(tools.rect);
                    }}
                    toolTitle={tools.rect.title}
                  />

                  <ToolSubPanelBtn
                    icon={tools.comment.icon}
                    active={isActive(tools.comment)}
                    onSelect={() => {
                      onResetShape();
                      onToolChange(tools.comment);
                    }}
                    toolTitle={tools.comment.title}
                  />
                </div>

                <div className="tw-flex tw-justify-center">
                  <ColorSelector
                    color={shapeGroupOptions.strokeColor}
                    onChange={(val) =>
                      shapeGroupOptionsChangeHandler('strokeColor', val)
                    }
                    className="tw-mr-2"
                  />

                  <StrokeWidthSelector
                    width={shapeGroupOptions.strokeWidth}
                    onChange={(val) =>
                      shapeGroupOptionsChangeHandler('strokeWidth', val)
                    }
                  />

                  <ColorSelector
                    icon={fullFillerIcon}
                    color={shapeGroupOptions.fillColor}
                    colorIndicator={true}
                    onChange={(val) =>
                      shapeGroupOptionsChangeHandler('fillColor', val)
                    }
                    className="tw-mr-2"
                  />
                </div>
              </div>
            </ToolBtn>

            <ToolBtn
              isOpenEditTool={false}
              onSelect={() => onToolChange(tools.blur)}
              icon={tools.blur.icon}
              active={isActive(tools.blur)}
              toolTitle={tools.blur.title}
              placement="right"
            ></ToolBtn>
          </ToolsRow>
          <ToolsRow>
            <ToolBtn
              isOpenEditTool={
                currentTool?.name == 'conversation' ? true : false
              }
              title="conversation"
              toolTitle={tools.conversation.title}
              onSelect={() => {
                onToolChange(tools.conversation);
                onResetShape();
              }}
              icon={tools.conversation.icon}
              active={isActive(tools.conversation)}
              toolSubPanelClasses="tw-bg-toolbox-light tw-pt-0px tw-px-0px tw-w-330px"
            >
              <Tabs
                tabBarStyle={{
                  margin: '0px',
                  borderRadius: '10px 10px 0px 0px',
                  overflow: 'hidden',
                }}
                hideAdd
                type="card"
                activeKey={conversationOptions.category}
              >
                <TabPane
                  className="tabs"
                  tab={
                    <span
                      className="styled-tabs"
                      id="corporate"
                      onClick={() =>
                        conversationOptionsChangeHandler(
                          'category',
                          'corporate',
                        )
                      }
                    >
                      Corporate
                    </span>
                  }
                  key="corporate"
                >
                  <div className=" tw-flex tw-flex-wrap tw-bg-ghost-white tw-p-2 tw-rounded-6px tw-m-5px ">
                    {conversationData.map((data, index) =>
                      data.category === 'corporate' ? (
                        <div
                          className={classNames(
                            'tw-flex tw-items-center tw-justify-center tw-cursor-pointer tw-rounded tw-select-none tw-p-10px hover:tw-bg-conv-active tw-transition-all tw-m-1 ',
                            {
                              'tw-bg-sub-btn':
                                conversationOptions.filename ===
                                data.fileName.toString(),
                            },
                          )}
                          key={`conversation_${index}`}
                          onClick={() => {
                            onResetShape();
                            onToolChange(tools.conversation);
                            onConversationOptionsChange({
                              category: data.category,
                              filename: data.fileName,
                              fillColor: data.fillColor,
                              fontFamily: data.fontFamily,
                              strokeColor: data.strokeColor,
                              strokeWidth: data.strokeWidth,
                              textColor: data.textColor,
                              textSize: data.textSize,
                              textStrokeColor: data.textStrokeColor,
                              textStrokeWidth: data.textStrokeWidth,
                              data: data.data,
                              dash: data.dash,
                            });
                          }}
                        >
                          <img
                            src={`${process.env.STATIC_FILES_URL}/images/conversation/${data.fileName}`}
                            className="tw-w-70px tw-h-70px tw-max-w-none"
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                </TabPane>
                <TabPane
                  className="tabs"
                  tab={
                    <span
                      className="styled-tabs"
                      id="fun"
                      onClick={() =>
                        conversationOptionsChangeHandler('category', 'fun')
                      }
                    >
                      {' '}
                      Fun{' '}
                    </span>
                  }
                  key="fun"
                >
                  <div className=" tw-flex tw-flex-wrap tw-bg-ghost-white tw-p-2 tw-rounded-6px  tw-m-5px ">
                    {conversationData.map((data, index) =>
                      data.category === 'fun' ? (
                        <div
                          className={classNames(
                            'tw-flex tw-items-center tw-justify-center tw-cursor-pointer tw-rounded tw-select-none tw-p-10px hover:tw-bg-conv-active tw-transition-all tw-m-1 ',
                            {
                              'tw-bg-sub-btn':
                                conversationOptions.filename ===
                                data.fileName.toString(),
                            },
                          )}
                          key={`conversation_${index}`}
                          onClick={() => {
                            onResetShape();
                            onToolChange(tools.conversation);
                            onConversationOptionsChange({
                              category: data.category,
                              filename: data.fileName,
                              fillColor: data.fillColor,
                              fontFamily: data.fontFamily,
                              strokeColor: data.strokeColor,
                              strokeWidth: data.strokeWidth,
                              textColor: data.textColor,
                              textSize: data.textSize,
                              textStrokeColor: data.textStrokeColor,
                              textStrokeWidth: data.textStrokeWidth,
                              data: data.data,
                              dash: data.dash,
                            });
                          }}
                        >
                          <img
                            src={`${process.env.STATIC_FILES_URL}/images/conversation/${data.fileName}`}
                            className="tw-w-70px tw-h-70px tw-max-w-none"
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                </TabPane>
                <TabPane
                  className="tabs"
                  tab={
                    <span
                      className="styled-tabs"
                      id="colorful"
                      onClick={() =>
                        conversationOptionsChangeHandler('category', 'colorful')
                      }
                    >
                      {' '}
                      Colorful{' '}
                    </span>
                  }
                  key="colorful"
                >
                  <div className=" tw-flex tw-flex-wrap tw-bg-ghost-white tw-p-2 tw-rounded-6px  tw-m-5px ">
                    {conversationData.map((data, index) =>
                      data.category === 'colorful' ? (
                        <div
                          className={classNames(
                            'tw-flex tw-items-center tw-justify-center tw-cursor-pointer tw-rounded tw-select-none tw-p-10px hover:tw-bg-conv-active tw-transition-all tw-m-1 ',
                            {
                              'tw-bg-sub-btn ':
                                conversationOptions.filename ===
                                data.fileName.toString(),
                            },
                          )}
                          key={`conversation_${index}`}
                          onClick={() => {
                            onResetShape();
                            onToolChange(tools.conversation);
                            onConversationOptionsChange({
                              category: data.category,
                              filename: data.fileName,
                              fillColor: data.fillColor,
                              fontFamily: data.fontFamily,
                              strokeColor: data.strokeColor,
                              strokeWidth: data.strokeWidth,
                              textColor: data.textColor,
                              textSize: data.textSize,
                              textStrokeColor: data.textStrokeColor,
                              textStrokeWidth: data.textStrokeWidth,
                              data: data.data,
                              dash: data.dash,
                            });
                          }}
                        >
                          <img
                            src={`${process.env.STATIC_FILES_URL}/images/conversation/${data.fileName}`}
                            className="tw-w-70px tw-h-70px tw-max-w-none"
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                </TabPane>
                <TabPane
                  className="tabs"
                  tab={
                    <span
                      className="styled-tabs"
                      id="outline"
                      onClick={() =>
                        conversationOptionsChangeHandler('category', 'outline')
                      }
                    >
                      {' '}
                      Outline{' '}
                    </span>
                  }
                  key="outline"
                >
                  <div className=" tw-flex tw-flex-wrap tw-bg-ghost-white tw-p-2 tw-rounded-6px  tw-m-5px ">
                    {conversationData.map((data, index) =>
                      data.category === 'outline' ? (
                        <div
                          className={classNames(
                            'tw-flex tw-items-center tw-justify-center tw-cursor-pointer tw-rounded tw-select-none tw-p-10px hover:tw-bg-conv-active tw-transition-all tw-m-1 ',
                            {
                              'tw-bg-sub-btn  ':
                                conversationOptions.filename ===
                                data.fileName.toString(),
                            },
                          )}
                          key={`conversation_${index}`}
                          onClick={() => {
                            onResetShape();
                            onToolChange(tools.conversation);
                            onConversationOptionsChange({
                              category: data.category,
                              filename: data.fileName,
                              fillColor: data.fillColor,
                              fontFamily: data.fontFamily,
                              strokeColor: data.strokeColor,
                              strokeWidth: data.strokeWidth,
                              textColor: data.textColor,
                              textSize: data.textSize,
                              textStrokeColor: data.textStrokeColor,
                              textStrokeWidth: data.textStrokeWidth,
                              data: data.data,
                              dash: data.dash,
                            });
                          }}
                        >
                          <img
                            src={`${process.env.STATIC_FILES_URL}/images/conversation/${data.fileName}`}
                            className="tw-w-70px tw-h-70px tw-max-w-none"
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                </TabPane>
              </Tabs>
              <div className="tw-px-5">
                <PanelSplitter />
              </div>

              <div className="tw-flex tw-justify-around tw-px-3">
                <ColorSelector
                  icon={FillTIcon}
                  color={conversationOptions.textColor}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('textColor', val)
                  }
                  className="tw-mr-2"
                />

                <ColorSelector
                  icon={textStrokeIcon}
                  color={conversationOptions.textStrokeColor}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('textStrokeColor', val)
                  }
                  className="tw-mr-2"
                />

                <ColorSelector
                  icon={fullFillerIcon}
                  color={conversationOptions.fillColor}
                  colorIndicator={true}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('fillColor', val)
                  }
                  className="tw-mr-2"
                />
                <ColorSelector
                  color={conversationOptions.strokeColor}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('strokeColor', val)
                  }
                  className="tw-mr-2"
                />
                <StrokeWidthSelector
                  width={conversationOptions.strokeWidth}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('strokeWidth', val)
                  }
                />
              </div>

              <div className="tw-flex tw-justify-around tw-w-full tw-px-3 tw-pt-3">
                <Select
                  value={conversationOptions.fontFamily}
                  style={{
                    fontFamily: conversationOptions.fontFamily,
                  }}
                  size={'large'}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('fontFamily', val)
                  }
                  className=" tw-w-full tw-bg-white  tw-rounded-lg app-selectable"
                >
                  {fonts.map((font, index) => (
                    <Select.Option
                      key={`font_${index}`}
                      value={font}
                      className="app-selectable"
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </Select.Option>
                  ))}
                </Select>

                <div className=" tw-bg-white  tw-rounded-lg tw-flex tw-justify-center  tw-mx-5px ">
                  {' '}
                  <AppNumberSelector
                    value={conversationOptions.textSize}
                    max={128}
                    min={8}
                    valuesArr={[]}
                    light
                    step={8}
                    onChange={(val) =>
                      conversationOptionsChangeHandler('textSize', val)
                    }
                  />
                </div>
              </div>
            </ToolBtn>

            <WatermarkToolBtn
              scale={stageScale}
              isOpenEditTool={currentTool?.name == 'watermark' ? true : false}
              stage={stage}
              options={watermarkOptions}
              isActive={isActive(tools.watermark)}
              onChange={onWatermarkOptionsChange}
              onToolChange={onToolChange}
              onSaveHistory={onSaveHistory}
            />
          </ToolsRow>

          <ToolsRow>
            <ToolBtn
              onSelect={() => {
                onUndo();
                setTimeout(() => {
                  onToolChange(tools.undo);
                });
              }}
              icon={tools.undo.icon}
              disabled={!canUndo}
              isOpenEditTool={false}
              toolTitle={tools.undo.title}
            />
            <ToolBtn
              onSelect={() => {
                onRedo();
                setTimeout(() => {
                  onToolChange(tools.redo);
                });
              }}
              toolTitle={tools.redo.title}
              icon={tools.redo.icon}
              disabled={!canRedo}
              isOpenEditTool={false}
              placement="right"
            />
          </ToolsRow>
          <ToolsRow>
            <ToolBtn
              onSelect={() => {
                onUndo(true);
                setTimeout(() => {
                  onToolChange(tools.clear);
                });
              }}
              toolTitle={tools.clear.title}
              icon={tools.clear.icon}
              disabled={!canUndo}
              isOpenEditTool={false}
            />
            <ToolBtn
              onSelect={onCut}
              icon={cutIcon}
              toolTitle="Cut"
              disabled={!isActive(tools.pointer) || !pointerTarget}
              isOpenEditTool={false}
              placement="right"
            />
          </ToolsRow>

          {/* <ToolsRow>
          <ToolBtn
            onSelect={onSaveAsJPG}
            icon={jpgIcon}
            isOpenEditTool={false}
          />

          <ToolBtn
            onSelect={onSaveAsPNG}
            icon={pngIcon}
            isOpenEditTool={false}
          />
        </ToolsRow>

        <ToolsRow>
          <ToolBtn
            onSelect={onSaveAsPDF}
            icon={pdfIcon}
            isOpenEditTool={false}
          />

          <GoogleDriveTool
            onOk={onUploadToDrive}
            isOpenDriveTool={false}
            onSelect={onToolChange}
            active={isActive(tools.drive)}
            oldName={oldName}
          />
        </ToolsRow> */}
        </div>
        <ToolsRow>
          <ToolBtn
            icon={copyIcon}
            toolTitle="Copy"
            isOpenEditTool={false}
            disabled={!clipboardCopyEnabled}
            onSelect={clipboardCopy}
          />

          {/* <SendEmailTool
            isOpenEmailTool={false}
            onSelect={onToolChange}
            active={isActive(tools.email)}
            onSave={onSave}
          /> */}
          <ShareTool
            image={editorImage}
            isOpenEditTool={currentTool?.name == 'share' ? true : false}
            active={isActive(tools.share)}
            onToolChange={onToolChange}
            onResetShape={onResetShape}
            title="share"
            save={onSave}
          />
        </ToolsRow>

        {/* <ToolsRow>
          {user && user.isSlackIntegrate && (
            <SendSlackTool
              isOpenSlackTool={false}
              onSelect={onToolChange}
              active={isActive(tools.slack)}
              onSave={onSave}
              history={history}
            />
          )}
          <SendWhatsAppTool
            isOpenTool={false}
            onSelect={onToolChange}
            active={isActive(tools.whatsApp)}
            onSave={onSave}
            history={history}
          />
        </ToolsRow> */}

        <ToolsRow>
          {/* <CommentsTool
            options={commentsOptions}
            isOpenEditTool={currentTool?.name == 'comments' ? true : false}
            active={isActive(tools.comments)}
            onToolChange={onToolChange}
            onResetShape={onResetShape}
            title="comments"
            onChange={onCommentsOptionsChange}
          /> */}

          <SavingTool
            isOpenEditTool={currentTool?.name == 'saving' ? true : false}
            active={isActive(tools.saving)}
            onToolChange={onToolChange}
            onResetShape={onResetShape}
            title="saving"
            downloadPng={onSaveAsPNG}
            downloadPdf={onSaveAsPDF}
            downloadJpg={onSaveAsJPG}
            saveToDrive={onUploadToDrive}
            image={editorImage}
            stage={stage}
            stageScale={stageScale}
            initialDimentions={initialDimentions}
            resizeDimentions={resizeDimentions}
            setLoading={setLoading}
          />
        </ToolsRow>

        <div className="tw-px-1">
          <div className=" tw-rounded-2xl tw-bg-white tw-flex tw-justify-center tw-my-5px  tw-border-2 tw-border-dark-grey">
            <AppNumberSelector
              value={stageScale}
              min={25}
              max={200}
              suffix="%"
              step={25}
              onChange={onStageScaleChange}
            />
          </div>
        </div>
        <div className="tool-box-end">
          <div className=" tw-pt-2 tw-px-1">
            <AppButton
              className=" tw-py-2px tw-px-1px tw-mb-1 tw-rounded-2xl tw-border-2 tw-border-dark-grey"
              onClick={onSaveAsJPG}
              full
              bgColor={'tw-bg-white'}
            >
              <div className="tw-text-xs  tw-text-black ">Download</div>
            </AppButton>
            <AppButton
              className="  tw-py-1px tw-px-1px tw-my-1  h-max-md:tw-py-1px h-max-md:tw-mb-1   tw-rounded-2xl  tw-border-2 tw-border-torea-bay  "
              onClick={() => {
                saveScreenshot();
              }}
              full
            >
              <div className="tw-text-xs">Save </div>
            </AppButton>
            <AppButton
              className=" tw-py-1px tw-px-1px  tw-mb-2 tw-rounded-2xl  tw-border-2 tw-border-cosmos"
              onClick={onCancelHandler}
              full
              bgColor={'tw-bg-white'}
            >
              <div className="tw-text-xs  tw-text-red">
                {fromExisted ? 'Back' : 'Cancel'}
              </div>
            </AppButton>
          </div>
        </div>
        {
          //CANCEL BUTTON
        }
        {/* <div>
          <ToolBtn
            onSelect={() => onToolChange(tools.eraser)}
            icon={BiEraser}
            active={isActive(tools.eraser)}
          />
          <ToolBtn
            onSelect={() => onToolChange(tools.rect)}
            icon={GiSquare}
            active={isActive(tools.rect)}
          />

          <div className="tw-flex tw-items-center">
            <ToolBtn
              onSelect={() => onToolChange(tools.elipse)}
              icon={GiCircle}
              active={isActive(tools.elipse) || isActive(tools.circle)}
            />
            {(isActive(tools.elipse) || isActive(tools.circle)) && (
              <div className="tw-flex tw-items-center">
                <Checkbox
                  checked={isActive(tools.circle)}
                  onChange={activateCircle}
                  className="tw-mx-2"
                />
                <div className="tw-text-secondary">Circle</div>
              </div>
            )}
          </div>
          <ToolBtn
            onSelect={() => onToolChange(tools.star)}
            icon={BiStar}
            active={isActive(tools.star)}
          />
          <ToolBtn
            onSelect={() => onToolChange(tools.arrow)}
            icon={RiArrowRightUpFill}
            active={isActive(tools.arrow)}
          />

          {[
            tools.pencil,
            tools.eraser,
            tools.rect,
            tools.circle,
            tools.elipse,
            tools.arrow,
            tools.star,
          ].some((tool) => compareTools(activeTool, tool)) && (
            <>
              <ToolsOptions
                fillColor={toolsOptions.fillColor}
                strokeColor={toolsOptions.strokeColor}
                strokeWidth={toolsOptions.strokeWidth}
                numPoints={toolsOptions.numPoints}
                innerRadius={toolsOptions.innerRadius}
                outerRadius={toolsOptions.outerRadius}
                activeTool={activeTool}
                onToolsOptionsChange={onToolsOptionsChange}
              />
              <PanelSplitter />
            </>
          )}

          <ToolBtn
            onSelect={() => onToolChange(tools.text)}
            icon={IoText}
            active={isActive(tools.text)}
          />
          {isActive(tools.text) && (
            <TextOptions
              fillColor={textOptions.fillColor}
              strokeColor={textOptions.strokeColor}
              strokeWidth={textOptions.strokeWidth}
              fontSize={textOptions.fontSize}
              onTextOptionsChange={onTextOptionsChange}
            />
          )}
          <PanelSplitter />
          <div className="tw-relative">
            <ToolBtn
              onSelect={selectResizeToolHandler}
              icon={GiResize}
              active={isActive(tools.resize)}
            />
            <ResizeTool
              show={isActive(tools.resize)}
              onResize={resizeHandler}
              onClose={closeResizeTool}
              initialWidth={stage.width()}
              initialHeight={stage.height()}
            />
          </div>
          <PanelSplitter />
          <ToolBtn onSelect={onUndo} icon={BiUndo} disabled={!canUndo} />
          <ToolBtn onSelect={onRedo} icon={BiRedo} disabled={!canRedo} />
        </div>
        <div className="tw-flex tw-items-center">
        { user &&  
          <React.Fragment>
            <AppButton
              onClick={() =>
                navigate(panelRoutes.images.path)
              }
              className="tw-mr-2"
            >
              My Screenshots
            </AppButton>
            <AppButton
              onClick={onApplyChanges}
              color="green"
              className="tw-mr-2"
            >
              Apply changes
            </AppButton>
          </React.Fragment>
          }
        </div> */}
      </div>
    </Draggable>
  );
};

export default ToolsPanel;
