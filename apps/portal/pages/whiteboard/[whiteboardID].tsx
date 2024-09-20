/* eslint-disable react/no-children-prop */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-var */
/* eslint-disable no-inner-declarations */
import router, { useRouter } from 'next/router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Konva from 'konva';
import { Stage } from 'konva/lib/Stage';
import { KonvaEventObject } from 'konva/lib/Node';
import Toolbar from 'components/pagesComponents/_whiteboardScreen/whiteboardToolbar/Toolbar';
import Topbar from 'components/pagesComponents/_whiteboardScreen/whiteboardTopbar/Topbar';
import {
  drawnName,
  getLayer,
} from 'components/pagesComponents/_editorScreen/editorHelpers/editorHelper';
import {
  tools,
  ITool,
  compareWhiteboardTools,
} from '../../components/pagesComponents/_whiteboardScreen/whiteboardToolbar/whiteboard_tools';
import {
  destroyPointerTransformer,
  initPointerTransformer,
} from 'components/pagesComponents/_editorScreen/editorHelpers/transformerHelper';

import {
  drawGuides,
  getGuides,
  getObjectSnappingEdges,
  getLineGuideStops,
  guidesMove,
} from 'components/pagesComponents/_whiteboardScreen/whiteboardHelpers/whiteboardGuides';
import { panelRoutes, preRoutes } from 'components/_routes';
import {
  deleteWhiteboard,
  getWhiteboardById,
  getWhiteboardByIdShared,
} from 'app/services/whiteboards';
import { initFreeDraw } from 'components/pagesComponents/_whiteboardScreen/whiteboardHelpers/whiteboardFreeDrawer';
import { IPencilGroupOptions } from 'app/interfaces/tools_interfaces/IPencilGroupOptions';
import { initPencilGroupOptions } from 'components/pagesComponents/_editorScreen/initialToolsSettings';
import { Layer } from 'konva/lib/Layer';
import Sidebar from 'components/pagesComponents/_whiteboardScreen/whiteboardSidebar/Sidebar';
import classNames from 'classnames';
import Draggable from 'react-draggable';
import { ITextOptions } from 'app/interfaces/tools_interfaces/ITextOptions';
import {
  initTextOptions,
  initCommentsOptions,
} from 'components/pagesComponents/_editorScreen/initialToolsSettings';
import ToolButton from 'components/pagesComponents/_whiteboardScreen/whiteboardToolbar/ToolButton';
import styles from '../../components/pagesComponents/_whiteboardScreen/whiteboardToolbar/toolButton.module.scss';
import { createNewStage } from 'components/pagesComponents/_whiteboardScreen/whiteboardHelpers/WhiteboardFunctions';
import OutsideClickHandler from 'react-outside-click-handler';
import { ICommentsOptions } from 'app/interfaces/tools_interfaces/ICommentsGroupOptions';
import useAuthenticateUser from 'hooks/useAuthenticateUser';
import { IMarkerComment } from 'app/interfaces/IMarkerComment';
import {
  baseCommentOptions,
  initCommentDraw,
} from 'components/pagesComponents/_whiteboardScreen/whiteboardHelpers/WhiteboardCommentDrawer';
import { Line } from 'konva/lib/shapes/Line';
import {
  loadingMessage,
  updateMessage,
} from 'app/services/helpers/toastMessages';
import AppSpinner from 'components/containers/appSpinner/AppSpinner';
import CommentContentPopup from 'components/pagesComponents/_whiteboardScreen/whiteboardHelpers/commentsPopup/CommentContentPopup';
import { IWhiteboard } from 'app/interfaces/IWhiteboard';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';

const WhiteboardEditor: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [pointerTarget, setPointerTarget] = useState<any>();
  const [current_stage, setCurrentStage] = useState<Stage | null>(null);
  const [whiteboardID, setWhiteboardID] = useState<any>({});
  const [stageList, setStageList] = useState<Array<Stage>>([]);
  const [stageScale, setStageScale] = useState<number>(100);
  const [active_tool, setActiveTool] = useState<ITool | null>(null);
  const [textOptions, setTextOptions] =
    useState<ITextOptions>(initTextOptions());
  const [commentsOptions, setCommentsOptions] = useState<ICommentsOptions>(
    initCommentsOptions(),
  );
  const user = useAuthenticateUser();
  const [currentShape, setCurrentShape] = useState(null);
  const [comments, addComment] = useState<Array<IMarkerComment>>([]);

  //Initial drawwing options
  const [pencilGroupOptions, setPencilGroupOptions] =
    useState<IPencilGroupOptions>(initPencilGroupOptions());

  const [keyPointerTargetListener, setkeyPointerTargetListener] = useState<{
    listener: any;
  }>({ listener: null });

  const stageObj = null;
  const mainDOMContainer = useRef<HTMLDivElement | null>(null);
  const frameContainer = useRef<HTMLIFrameElement | null>(null);
  const drawLayer = getLayer(current_stage, '#drawLayer');

  const getWhiteboard = useCallback(async () => {
    if (!router.isReady) return;

    try {
      setLoading(true);
      const pwhiteboardID = window.location.pathname.split('/')[2];
      const { s } = router.query;
      const isShared = s === '1';
      const whiteboard = isShared
        ? await getWhiteboardByIdShared(pwhiteboardID)
        : await getWhiteboardById(pwhiteboardID);

      if (!whiteboard) {
        return router.push(preRoutes.media + panelRoutes.whiteboards);
      }

      if (whiteboard) {
        setLoading(false);
        //To-do get stageObj from database then :

        if (stageObj !== null) {
          const newStage = Konva.Node.create(stageObj, 'stage');
          setCurrentStage(newStage);
        } else {
          createNewStage(
            stageList,
            setCurrentStage,
            setStageList,
            frameContainer,
          );
        }
      }
    } catch (e) {
      console.log(e);
    }
  }, [router]);

  useEffect(() => {
    getWhiteboard();
  }, [getWhiteboard]);

  const deleteWBoard = async () => {
    const id = loadingMessage();
    const data = await deleteWhiteboard(whiteboardID);

    if (!data)
      return updateMessage(id, 'Error while removing whiteboard', 'error');
    updateMessage(id, 'Successfully deleted whiteboard', 'success');
    return router.push(preRoutes.media + panelRoutes.whiteboards);
  };

  const saveHistory = () => {
    console.log();
  };

  const clearStageSettings = () => {
    //const drawLayer: Layer | undefined = getLayer(current_stage, '#drawLayer');
    // if (drawLayer) {
    // drawLayer.off('mousedown');
    //current_stage && destroyPointerTransformer(current_stage);
    // }

    current_stage?.removeEventListener('mousedown');
    current_stage?.removeEventListener('mousemove');
    current_stage?.removeEventListener('mouseup');
  };

  const setStageSettings = () => {
    const drawLayer: Layer | undefined = getLayer(current_stage, '#drawLayer');
    drawLayer?.on('mousedown', pointerEventListener);
  };

  const pointerEventListener = (e: KonvaEventObject<MouseEvent>) => {
    checkShapeType(e.target);
    if (current_stage && e.target.name() === drawnName) {
      setPointerTarget(e.target);
      setActiveTool(tools.pointer);
    }
  };

  const initPointer = () => {
    if (current_stage) {
      destroyPointerTransformer(current_stage);
      initPointerTransformer(current_stage, [pointerTarget], () =>
        console.log(),
      );
    }
  };

  const keyPointerTargetListenerInstance = (e: KeyboardEvent) => {
    if ((e && e.keyCode === 46) || (e && e.keyCode === 8)) {
      destroyPointerTransformer(current_stage);
      pointerTarget?.destroy();
    }
    setPointerTarget(null);
    saveHistory();
  };

  useEffect(() => {
    keyPointerTargetListener &&
      window.addEventListener('keydown', keyPointerTargetListener.listener);
  }, [keyPointerTargetListener]);

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', function (e) {
      // on esc do not set value back to node
      if (e.keyCode === 27) {
        destroyPointerTransformer(current_stage);
        setActiveTool(null);
      }
    });
  }
  useEffect(() => {
    destroyPointerTransformer(current_stage);
    if (active_tool === tools.pointer && pointerTarget) {
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
  }, [active_tool, pointerTarget]);

  const operation: GlobalCompositeOperation = 'source-over';
  //Drawing
  useEffect(() => {
    clearStageSettings();
    setStageSettings();
    if (current_stage && active_tool) {
      compareWhiteboardTools(active_tool, tools.drawer) &&
        initFreeDraw({
          stage: current_stage,
          options: pencilGroupOptions,
          operation,
          saveHistory,
        });

      compareWhiteboardTools(active_tool, tools.comments) &&
        initCommentDraw({
          stage: current_stage,
          options: {
            id: commentsOptions.id,
            position: commentsOptions.position,
          },
          shapeType: tools.comments.tool,
          saveHistory,
          userImg: user.photoURL,
        });
    }
  }, [active_tool, current_stage]);

  useEffect(() => {
    if (!frameContainer.current) return;

    frameContainer.current.style.transform = `scale(${stageScale / 100})`;

    if (mainDOMContainer.current) {
      frameContainer.current.style.width = `${mainDOMContainer.current?.clientWidth}px`;
    }
  }, [stageScale]);
  //START----------------------------------------------------------
  pointerTarget?.on('dragmove', function (e) {
    drawLayer?.find('.guid-line').forEach((l) => l.destroy());
    var lineGuideStops = getLineGuideStops(pointerTarget, current_stage as any);
    var itemBounds = getObjectSnappingEdges(pointerTarget);
    var guides = getGuides(lineGuideStops, itemBounds);

    if (!guides.length) {
      return;
    }

    drawGuides(guides, drawLayer as any);

    var absPos = pointerTarget.absolutePosition();
    guidesMove(guides, absPos);
    pointerTarget.absolutePosition(absPos);
  });

  pointerTarget?.on('dragend', function (e) {
    drawLayer?.find('.guid-line').forEach((l) => l.destroy());
  });
  //END-----------------------------------------------------------------------

  //  Konva Stage Constructor----start

  drawLayer?.on('mousedown', pointerEventListener);

  const [openVideoPanel, setOpenVideoPanel] = useState<boolean>(false);
  const updateDependedActiveTool = (dependencies: ITool[]) => {
    dependencies.some((tool) => compareWhiteboardTools(active_tool, tool)) &&
      setActiveTool(Object.assign({}, active_tool));
  };

  const updateCommentProperties = (shape: any, options: any) => {
    if (shape) {
      //shape.parent?.children[0]?.fill(options.fill);
      saveHistory();
    }
  };

  useEffect(() => {
    updateCommentProperties(currentShape, commentsOptions);
    updateDependedActiveTool([tools.comments]);
  }, [commentsOptions]);

  const outsideClickHandler = (e: MouseEvent) => {
    setOpenVideoPanel(false);
  };

  const checkShapeType = (shape: any) => {
    setCurrentShape(shape);
    if (shape.attrs.shapeType == 'comments') {
      const currentCommentOptions = {
        ...commentsOptions,
        //id: shape.parent?.children[1]?.text(),
        position: {
          x: shape.getAbsolutePosition().x,
          y: shape.getAbsolutePosition().y,
        },
        fill: shape.parent?.children[0]?.fill(),
      };

      if (
        JSON.stringify(commentsOptions) !==
        JSON.stringify(currentCommentOptions)
      ) {
        setCommentsOptions(currentCommentOptions);
      }
    }
  };

  const resetShape = () => {
    setCurrentShape(null);
  };

  if (current_stage) {
    if (active_tool?.tool === tools.comments.tool) {
      const cursorgroup = new Konva.Group({
        id: 'commentGroup',
        draggable: true,
      });

      const userImg = document.createElement('img');
      userImg.src = user.photoURL || '';
      const cursorComment = new Line(baseCommentOptions);
      cursorComment.setAttrs({
        x: current_stage.getRelativePointerPosition()?.x,
        y: current_stage.getRelativePointerPosition()?.y,
        fillPatternImage: userImg,
        opacity: 0.5,
      });
      cursorgroup.add(cursorComment);
      const mark = cursorgroup.toDataURL();
      current_stage.container().style.cursor = `url(${mark}), auto`;
    }
  }
  //Event listeners

  return (
    <div
      ref={mainDOMContainer}
      style={{
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '100%',
        overflow: 'scroll auto',
      }}
      className=" !tw-bg-seashell"
    >
      <Topbar />
      <div
        className="tw-fixed tw-z-20"
        style={{
          top: '8%',
          left: '5px',
          marginBottom: '10px',
        }}
      >
        {' '}
        <OutsideClickHandler onOutsideClick={outsideClickHandler}>
          {openVideoPanel ? (
            <div className="tw-flex tw-drop-shadow-md tw-align-center">
              <ToolButton
                active={active_tool === tools.record ? true : false}
                onSelect={() => {
                  setActiveTool(tools.record);
                }}
                icon={tools.record.icon}
                iconSize={{ width: 20, height: 19 }}
                className={classNames(
                  styles.toolButton,
                  `tw-rounded-l-md tw-p-2 tw-h-40px tw-w-50px tw--mr-2 tw-pr-2`,
                  active_tool === tools.record
                    ? '!tw-bg-violet-dark'
                    : '!tw-bg-primary-purple',
                )}
              />
              <ToolButton
                active={active_tool === tools.task ? true : false}
                onSelect={() => {
                  setActiveTool(tools.task);
                }}
                icon={tools.task.icon}
                iconSize={{ width: 20, height: 20 }}
                className={classNames(
                  styles.toolButton,
                  `tw-p-2 tw-h-40px tw-w-50px tw--mr-1 tw-rounded-none`,
                  active_tool === tools.task
                    ? '!tw-bg-violet-dark'
                    : '!tw-bg-primary-purple',
                )}
              />
              <ToolButton
                active={active_tool === tools.tag ? true : false}
                onSelect={() => {
                  // setActiveTool(tools.tag);
                  createNewStage(
                    stageList,
                    setCurrentStage,
                    setStageList,
                    frameContainer,
                  );
                }}
                icon={tools.tag.icon}
                iconSize={{ width: 20, height: 18 }}
                className={classNames(
                  styles.toolButton,
                  `tw-p-2 tw-h-40px tw-w-50px tw-rounded-none`,
                  active_tool === tools.tag
                    ? '!tw-bg-violet-dark'
                    : '!tw-bg-primary-purple',
                )}
              />
              <ToolButton
                active={active_tool === tools.upload ? true : false}
                onSelect={() => {
                  setActiveTool(tools.upload);
                }}
                icon={tools.upload.icon}
                iconSize={{ width: 20, height: 20 }}
                className={classNames(
                  styles.toolButton,
                  `tw-p-2 tw-h-40px tw-w-50px tw--ml-1 tw-rounded-none tw-rounded-r-md`,
                  active_tool === tools.upload
                    ? '!tw-bg-violet-dark'
                    : '!tw-bg-primary-purple',
                )}
              />
            </div>
          ) : (
            <button
              className="tw-bg-whiteboard-purple tw-text-white tw-h-40px tw-w-50px tw-rounded-md tw-shadow-xl"
              onClick={() => setOpenVideoPanel(!openVideoPanel)}
            >
              <div className="tw-flex tw-justify-center tw-items-center tw-cursor-pointer">
                <Image
                  src={tools.plus.icon}
                  width={30}
                  height={30}
                  alt="plus icon"
                />
              </div>
            </button>
          )}
        </OutsideClickHandler>
      </div>

      <Toolbar
        setActiveTool={setActiveTool}
        active_tool={active_tool}
        textOptions={textOptions}
        onTextOptionsChange={setTextOptions}
        onResetShape={resetShape}
        commentsOptions={commentsOptions}
        //onCommentsOptionsChange={setCommentsOptions}
        //currentShape={currentShape}
        user={user}
        onWhiteboardDelete={deleteWBoard}
      />
      <Sidebar
        setPointerTarget={setPointerTarget}
        stageList={stageList}
        stageScale={stageScale}
        onStageScaleChange={setStageScale}
      />

      <div
        ref={frameContainer}
        style={{ position: 'relative', width: '88%', paddingTop: '5%' }}
        className={'tw-flex tw-items-center tw-justify-center tw-flex-col  '}
      >
        <CommentContentPopup
          stage={current_stage as any}
          user={user}
          //markerOptions={markerOptions}
          onCommentsOptionsChange={setCommentsOptions}
          currentShape={currentShape}
          scale={stageScale}
          comments={comments}
          addComment={addComment}
        />
        {/* <Draggable
          scale={stageScale / 100}
          disabled={active_tool ? true : false}
        >
          <div
            // onDoubleClick={() => createNewStage('stage2')}

            style={{ width: '800px', height: '800px' }}
          >
            Frame2
            <div
              onMouseEnter={() => {
                stageList.forEach((element) => {
                  if (element.getAttr('id') === 'stage') {
                    setCurrentStage(element);
                    console.log(element);
                  }
                });
              }}
              className={classNames(
                `tw-shadow-xl tw-bg-white tw-border-4 tw-border-trans`,
                current_stage?.getAttr('id') === 'stage'
                  ? '!tw-border-sub-btn'
                  : '',
              )}
              id="stage"
            ></div>
          </div>
        </Draggable> */}
      </div>
      <AppSpinner show={loading} />
    </div>
  );
};

export default WhiteboardEditor;
