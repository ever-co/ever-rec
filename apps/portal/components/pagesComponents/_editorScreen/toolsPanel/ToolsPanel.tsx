import React, { useCallback, useEffect, useState } from 'react';
import AppButton from 'components/controls/AppButton';
import { useRouter } from 'next/router';
import ToolBtn from './ToolBtn/ToolBtn';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import { Stage } from 'konva/lib/Stage';
import { Select, Tabs } from 'antd';
import { compareTools, ITool, tools } from './tools';
import { IToolsOptions } from 'app/interfaces/tools_interfaces/IToolsOptions';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Logo from 'components/elements/Logo';
import styles from './toolsPanel.module.scss';
// import { createLoginTab } from 'app/utilities/';
import Draggable from 'react-draggable';
import ToolsRow from './ToolsRow';
import ToolsColumn from './ToolsColumn';
import ToolSubPanelBtn from './ToolBtn/components/ToolSubPanelBtn';
import ColorSelector from './toolsOptions/ColorSelector';
import StrokeWidthSelector from './toolsOptions/strokeWidthSelector/StrokeWidthSelector';
import { IPencilGroupOptions } from 'app/interfaces/tools_interfaces/IPencilGroupOptions';
import { IEmojiOptions } from 'app/interfaces/tools_interfaces/IEmojiOptions';
import classNames from 'classnames';
import { IShapeGroupOptions } from 'app/interfaces/tools_interfaces/IShapeGroupOptions';
import { IConversationOptions } from 'app/interfaces/tools_interfaces/IConversationOptions';
import { IMarkerOptions } from 'app/interfaces/tools_interfaces/IMarkerGroupOptions';
import { conversationData } from 'app/utilities/conversation.data';
import WatermarkToolBtn from './ToolBtn/customToolBtn/WatermarkToolBtn/WatermarkToolBtn';
import SavingTool from './ToolBtn/customToolBtn/SavingToolBtn/SavingToolBtn';
import { IWatermarkOptions } from 'app/interfaces/tools_interfaces/IWatermarkOptions';
import ArrowTool from './ToolBtn/customToolBtn/ArrowTool/ArrowTool';
import MarkerTool from './ToolBtn/customToolBtn/MarkersToolBtn/MarkerTool';
import { IArrowGroupOptions } from 'app/interfaces/tools_interfaces/IArrowGroupOptions';
import { ITextOptions } from 'app/interfaces/tools_interfaces/ITextOptions';
import TextTool from './ToolBtn/customToolBtn/TextTool/TextTool';
import { Shape, ShapeConfig } from 'konva/lib/Shape';
import PanelAC from 'app/store/panel/actions/PanelAC';

// import { ClipboardItemInterface } from 'clipboard-polyfill/dist/overwrite-globals/ClipboardItem/spec';
import ResizeTool from './ToolBtn/customToolBtn/ResizeTool/ResizeTool';
import EraserTool from './ToolBtn/customToolBtn/EraserTool/EraserTool';
import AppNumberSelector from 'components/controls/AppNumberSelector';
// import '@/content/panel/screens/editorScreen/toolsPanel/ToolsPanel.pagesScss';
// import '@/content/popup/assets/conversationtoolPopup.pagesScss';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import IconBtn from './ToolBtn/components/IconBtn';

//Icons
import cutIcon from 'public/assets/svg/tools-panel/cut.svg';
import textStrokeIcon from 'public/assets/svg/tools-panel/T(Stroke).svg';
import FillTIcon from 'public/assets/svg/tools-panel/T(Fill).svg';
import fullFillerIcon from 'public/assets/svg/tools-panel/fullfiller.svg';
import copyIcon from 'public/assets/svg/tools-panel/copy.svg';
import close from 'public/assets/svg/tools-panel/close.svg';
import pin_lock from 'public/assets/svg/tools-panel/pin_lock.svg';
import pin_lock_black from 'public/assets/svg/tools-panel/pin_lock_black.svg';
import collapse_close from 'public/assets/svg/tools-panel/collapse_close.svg';
import expand_open from 'public/assets/svg/tools-panel/expand_open.svg';
// import browser from '@/app/utilities/browser';
import ds from 'public/assets/svg/tools-panel/ds.svg';
import { IUser } from 'app/interfaces/IUserData';
import PanelSplitter from './PanelSplitter';
import IEditorImage from 'app/interfaces/IEditorImage';
import Image from 'next/image';
import { imgSrcLoader } from '../editorHelpers/imgSrcLoader';
import useEditorVideo from 'hooks/useEditorVideo';
import { Emoji } from 'emoji-mart/dist/index';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';
import ShareTool from './ToolBtn/customToolBtn/ShareToolBtn/ShareToolBtn';
import { IWorkspace } from 'app/interfaces/IWorkspace';
import { Group } from 'konva/lib/Group';
import { init } from 'emoji-mart';
init({ data });

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

// TODO: we should reorder these - I suggest variables on top, functions on bottom - related variables and functions on the same level
interface IToolsPanelProps {
  stage: Stage;
  stageScale: number;
  onSaveHistory: () => void;
  onUndo: (all?: boolean) => void;
  onRedo: () => void;
  onCut: () => void;
  onSave: () => Promise<void>;
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
  pointerTarget: Stage | Shape<ShapeConfig> | Group | null;
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
  setRecordingController: React.Dispatch<
    React.SetStateAction<JSX.Element | null>
  >;
  editorImage: IEditorImage;
  workspace?: IWorkspace;
  setLoading: (imageLoaded: boolean) => void;
}

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
  setRecordingController,
  editorImage,
  workspace,
  setLoading,
}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { TabPane } = Tabs;
  const fromExisted: string = useSelector(
    (state: RootStateOrAny) => state.panel.fromExisted,
  );
  const [locked, setLocked] = useState<boolean>(true);
  const [show, setShow] = useState<boolean>(false);

  const {
    stopVideo,
    startVideo,
    resumeVideo,
    setRecordingStatus,
    recordingStatus,
    recordingIcon,
    videoContent,
    recordingController,
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
        router.push(
          workspace ? `/media/workspace/${workspace.id}` : '/media/images',
        );
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  const onCancelHandler = () => {
    if (recordingStatus != 'stop') {
      stopVideo();
    }
    window.history.length > 1
      ? router.push(
          workspace ? `/media/workspace/${workspace.id}` : '/media/images',
        )
      : window.close();
  };

  const onVideoRecordHandler = async () => {
    if (user && recordingStatus == 'stop') {
      startVideo();
    }
  };

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const handleStop = (event, dragElement) => {
    setX(dragElement.x);
    setY(dragElement.y);
  };

  useEffect(() => {
    if (videoContent) {
      setRecordingController(recordingController);
    } else {
      setRecordingController(null);
    }
  }, [videoContent]);

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

  const selectEmoji = async (selection) => {
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
      <div className={classNames(styles.mainContainer, styles.toolswrapper)}>
        <div className={styles.innerContainer}>
          {!locked ? (
            <div className={styles.toolbtnsmall}>
              <IconBtn
                size="10px"
                icon={pin_lock}
                onSelect={() => {
                  setLocked(true);
                }}
              />
            </div>
          ) : (
            <div className={styles.toolbtnsmall}>
              <IconBtn
                size="10px"
                icon={pin_lock_black}
                onSelect={() => {
                  setLocked(false);
                }}
              />
            </div>
          )}
          <div className={classNames(styles.toolbtnsmall, styles.spacingLeft)}>
            <IconBtn
              size="10px"
              icon={close}
              onSelect={() => {
                onCancelHandler();
              }}
            />
          </div>
        </div>
        <div className={styles.toolboxstart}>
          <div onClick={() => switch3D()} className={styles.container}>
            <Logo width={89} height={24} type="default" />
            <div className={styles.absoluteContainer}></div>
          </div>{' '}
          <ToolsColumn>
            <ToolBtn
              toolTitle={tools.video.title}
              large={true}
              panel3D={panel3D}
              isOpenEditTool={false}
              onSelect={() => {
                onResetShape();
                onVideoRecordHandler();
              }}
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
              <div
                className={classNames(styles.toolbtnsmall, styles.spacingTop)}
              >
                <IconBtn
                  size="10px"
                  icon={collapse_close}
                  onSelect={() => {
                    setShow(true);
                  }}
                />
              </div>
            ) : (
              <div
                className={classNames(styles.toolbtnsmall, styles.spacingTop)}
              >
                <IconBtn
                  size="10px"
                  icon={expand_open}
                  onSelect={() => {
                    setShow(false);
                  }}
                />
              </div>
            )}
            <Image src={ds} style={{ userSelect: 'none' }} alt="" />
          </ToolsColumn>
        </div>

        <div className={`${show ? styles.hidden : ''}`}>
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
              onSelect={() => {
                onResetShape();
                onToolChange(tools.crop);
              }}
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
              onSelect={() => {
                onResetShape();
                onToolChange(tools.pointer);
              }}
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
                <div className={styles.flexContainer}>
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

                <div className={styles.selectorWrapper}>
                  <ColorSelector
                    color={pencilGroupOptions.strokeColor}
                    onChange={(val) =>
                      pencilGroupOptionsChangeHandler('strokeColor', val)
                    }
                    className={styles.selectorWidth}
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
              onSelect={() => {
                onResetShape();
                onToolChange(tools.emoji);
              }}
              icon={tools.emoji.icon}
              active={isActive(tools.emoji)}
              placement="right"
              toolSubPanelClasses={styles.wrapper}
            >
              <div id="pickerContainer">
                {' '}
                <Picker
                  // set={'twitter'}
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
                />{' '}
              </div>
            </ToolBtn>
          </ToolsRow>
          <ToolsRow>
            <ToolBtn
              isOpenEditTool={currentTool?.name == 'figure' ? true : false}
              title="figure"
              toolTitle="Shapes"
              onSelect={() => {
                onResetShape();
                onToolChange(activeShapeTool());
              }}
              icon={activeShapeTool().icon}
              active={isActive(activeShapeTool())}
            >
              <div>
                <div className={styles.flexContainer}>
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

                <div className={styles.flexContainer}>
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

                <div className={styles.selectorWrapper}>
                  <ColorSelector
                    color={shapeGroupOptions.strokeColor}
                    onChange={(val) =>
                      shapeGroupOptionsChangeHandler('strokeColor', val)
                    }
                    className={styles.spacingRight}
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
                    className={styles.spacingRight}
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
              toolSubPanelClasses={styles.buttonContainer}
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
                  <div className={styles.containerWrapper}>
                    {conversationData.map((data, index) =>
                      data.category === 'corporate' ? (
                        <div
                          className={classNames(
                            styles.innerWrapper,
                            conversationOptions.filename ===
                              data.fileName.toString()
                              ? styles.bgColor
                              : '',
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
                          <Image
                            loader={imgSrcLoader}
                            src={`${baseURL}/images/conversation/${data.fileName}`}
                            width={70}
                            height={70}
                            alt={`${data.category}`}
                            unoptimized={true}
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
                  <div className={styles.containerWrapper}>
                    {conversationData.map((data, index) =>
                      data.category === 'fun' ? (
                        <div
                          className={classNames(
                            styles.innerWrapper,
                            conversationOptions.filename ===
                              data.fileName.toString()
                              ? styles.bgColor
                              : '',
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
                          <Image
                            loader={imgSrcLoader}
                            src={`${baseURL}/images/conversation/${data.fileName}`}
                            width={70}
                            height={70}
                            alt={`${data.category}`}
                            unoptimized={true}
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
                  <div className={styles.containerWrapper}>
                    {conversationData.map((data, index) =>
                      data.category === 'colorful' ? (
                        <div
                          className={classNames(
                            styles.innerWrapper,
                            conversationOptions.filename ===
                              data.fileName.toString()
                              ? styles.bgColor
                              : '',
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
                          <Image
                            loader={imgSrcLoader}
                            src={`${baseURL}/images/conversation/${data.fileName}`}
                            width={70}
                            height={70}
                            alt={`${data.category}`}
                            unoptimized={true}
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
                  <div className={styles.containerWrapper}>
                    {conversationData.map((data, index) =>
                      data.category === 'outline' ? (
                        <div
                          className={classNames(
                            styles.innerWrapper,
                            conversationOptions.filename ===
                              data.fileName.toString()
                              ? styles.bgColor
                              : '',
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
                          <Image
                            loader={imgSrcLoader}
                            src={`${baseURL}/images/conversation/${data.fileName}`}
                            width={70}
                            height={70}
                            alt={`${data.category}`}
                            unoptimized={true}
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                </TabPane>
              </Tabs>
              <div style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
                <PanelSplitter />
              </div>

              <div className={styles.colorSelectorContainer}>
                <ColorSelector
                  icon={FillTIcon}
                  color={conversationOptions.textColor}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('textColor', val)
                  }
                  className={styles.spacingRight}
                />

                <ColorSelector
                  icon={textStrokeIcon}
                  color={conversationOptions.textStrokeColor}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('textStrokeColor', val)
                  }
                  className={styles.spacingRight}
                />

                <ColorSelector
                  icon={fullFillerIcon}
                  color={conversationOptions.fillColor}
                  colorIndicator={true}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('fillColor', val)
                  }
                  className={styles.spacingRight}
                />
                <ColorSelector
                  color={conversationOptions.strokeColor}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('strokeColor', val)
                  }
                  className={styles.spacingRight}
                />
                <StrokeWidthSelector
                  width={conversationOptions.strokeWidth}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('strokeWidth', val)
                  }
                />
              </div>

              <div className={styles.wrapperContainer}>
                <Select
                  value={conversationOptions.fontFamily}
                  style={{
                    fontFamily: conversationOptions.fontFamily,
                  }}
                  size={'large'}
                  onChange={(val) =>
                    conversationOptionsChangeHandler('fontFamily', val)
                  }
                  className={classNames('app-selectable', styles.optionWrapper)}
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

                <div className={styles.numberSelector}>
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
        </ToolsRow> */}

          <ToolsRow>
            {/* <ToolBtn
            onSelect={onSaveAsPDF}
            icon={pdfIcon}
            isOpenEditTool={false}
          /> */}

            {/* <GoogleDriveTool
              onOk={onUploadToDrive}
              isOpenDriveTool={false}
              onSelect={onToolChange}
              active={isActive(tools.drive)}
              oldName={oldName}
            /> */}
          </ToolsRow>
        </div>
        <ToolsRow>
          <ToolBtn
            disabled={!clipboardCopyEnabled}
            onSelect={clipboardCopy}
            icon={copyIcon}
            isOpenEditTool={false}
            toolTitle={'Copy'}
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
        {/*
        <ToolsRow>
          {user && user.isSlackIntegrate && (
            <SendSlackTool
              isOpenSlackTool={false}
              onSelect={onToolChange}
              active={isActive(tools.slack)}
              onSave={onSave}
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
        <div style={{ paddingLeft: '0.5rem', paddingRight: '0.5rem' }}>
          <div className={styles.childContainer}>
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
        <div className={styles.toolboxend}>
          <div
            style={{
              paddingTop: '0.5rem',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
            }}
          >
            <AppButton
              className={styles.buttonWrapper}
              onClick={onSaveAsJPG}
              full
              bgColor={styles.backgroundColor}
            >
              <div style={{ color: 'black' }} className={styles.font}>
                Download
              </div>
            </AppButton>
            <AppButton className={styles.saveBtn} onClick={saveScreenshot} full>
              <div className={styles.font}>Save </div>
            </AppButton>
            <AppButton
              className={styles.cancelBtn}
              onClick={() => {
                onCancelHandler();
              }}
              full
              bgColor={styles.backgroundColor}
            >
              <div style={{ color: '#f45046' }} className={styles.font}>
                {fromExisted ? 'Back' : 'Cancel'}
              </div>
            </AppButton>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default ToolsPanel;
