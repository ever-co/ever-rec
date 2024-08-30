import {
  forwardRef,
  MouseEvent,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import styles from './toolBtn.module.scss';
import classNames from 'classnames';
import Image from 'next/image';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import PanelAC from 'app/store/panel/actions/PanelAC';
import OutsideClickHandler from 'react-outside-click-handler';
import ToolSubPanel from './components/ToolSubPanel';
import { tools } from 'components/pagesComponents/_editorScreen/toolsPanel/tools';
import AppSvg from 'components/elements/AppSvg';
import closeIcon from 'public/common/close-icon.svg';
import { Tooltip } from 'antd';

type ToolPlacement = 'left' | 'right';

interface IToolBtn {
  icon: string;
  active?: boolean;
  disabled?: boolean;
  placement?: ToolPlacement;
  toolSubPanelClasses?: string;
  isOpenEditTool: boolean;
  children?: JSX.Element | JSX.Element[];
  onSelect: () => void;
  onSubpanelClose?: () => void;
  title?: string;
  toolTitle?: string;
  loadingFunction?: () => void;
  large?: boolean;
  panel3D?: boolean;
}

const ToolBtn = forwardRef<{ closePanel: () => void }, IToolBtn>(
  (
    {
      icon,
      disabled,
      active,
      children,
      isOpenEditTool,
      placement = 'left',
      toolSubPanelClasses,
      onSubpanelClose,
      onSelect,
      title,
      toolTitle,
      loadingFunction,
      panel3D,
      large,
    },
    ref,
  ) => {
    const dispatch = useDispatch();

    useImperativeHandle(
      ref,
      (): {
        closePanel: () => void;
      } => ({
        closePanel,
      }),
    );

    const [toolPanelState, setToolPanelState] = useState<boolean>(false);
    const [screen, setScreen] = useState<number>(window.screen.availHeight);
    const currentTool: any = useSelector(
      (state: RootStateOrAny) => state.panel.currentTool,
    );

    const toolbarPosition: { x: number; y: number } = useSelector(
      (state: RootStateOrAny) => state.panel.toolspannelposition,
    );

    const clickHandler = (event: MouseEvent) => {
      if (!disabled) {
        onSelect();
        openPanel();
      }
    };

    const outsideClickHandler = (e: MouseEvent) => {
      if (currentTool?.clicked == true) {
        if (
          currentTool.name === 'pointer' &&
          (e.target as HTMLElement).classList.contains('konvajs-content') &&
          !(e.target as HTMLElement).classList.contains('app-selectable') &&
          !(e.target as HTMLElement).classList.contains('ant-select-item') &&
          !(e.target as HTMLElement).classList.contains(
            'ant-select-item-option-content',
          )
        ) {
          closePanel();
          // dispatch(PanelAC.setCurrentTool({ name: null, clicked: false }));
        }
      } else {
        // dispatch(PanelAC.setCurrentTool({ name: title, clicked: true }));
      }
    };

    const openPanel = () => {
      dispatch(PanelAC.setCurrentTool({ name: title, clicked: true }));
      setToolPanelState(true);
    };
    const closePanel = () => {
      dispatch(PanelAC.setCurrentTool({ name: null, clicked: false }));
      setToolPanelState(false);
      onSubpanelClose && onSubpanelClose();
    };

    useEffect(() => {
      if (!toolPanelState) {
        setToolPanelState(!disabled && !!children && toolPanelState);
      }
    }, []);

    useEffect(() => {
      if (!isOpenEditTool) {
        closePanel();
      } else {
        setTimeout(() => {
          openPanel();
        });
      }
    }, [isOpenEditTool]);

    useEffect(() => {
      if (loadingFunction) {
        loadingFunction();
      }
    }, [toolPanelState]);
    window.addEventListener('resize', () =>
      setScreen(window.screen.availHeight),
    );

    return (
      <div
        className={classNames(
          styles.parentContainer,
          large ? styles.toolbtnlarge : styles.toolbtn,
        )}
      >
        <Tooltip
          className={styles.flexContainer}
          placement={placement}
          title={toolTitle}
        >
          <div
            className={classNames(
              styles.tooltipWrapper,
              panel3D ? 'toolbtn-3d' : 'toolbtn-flat',
              disabled ? styles.lowOpacity : styles.fullOpacity,
              active ? styles.activeBg : styles.notActiveBg,
            )}
            onClick={clickHandler}
          >
            <div className={styles.icons}>
              <Image width={24} height={24} alt="icons" src={icon} />
            </div>
          </div>
        </Tooltip>

        {toolPanelState && !!children && (
          <OutsideClickHandler onOutsideClick={outsideClickHandler}>
            <div
              className={classNames(
                styles.absolute,
                toolTitle === tools.conversation.title ||
                  toolTitle === tools.emoji.title ||
                  toolTitle === tools.watermark.title ||
                  toolTitle === tools.saving.title
                  ? // toolTitle === tools.share.title
                    styles.negative
                  : styles.zero,
              )}
              style={
                placement === 'left' &&
                toolbarPosition.x < window.innerWidth / 2
                  ? {
                      left: '100px',
                      borderRadius: '10px',
                    }
                  : placement === 'right' &&
                      toolbarPosition.x < window.innerWidth / 2
                    ? {
                        left: '60px',
                        borderRadius: '10px',
                      }
                    : placement === 'left' &&
                        toolbarPosition.x > window.innerWidth / 2
                      ? {
                          right: '75px',
                          borderRadius: '10px',
                        }
                      : {
                          right: '100px',
                          borderRadius: '10px',
                        }
              }
            >
              <ToolSubPanel className={toolSubPanelClasses}>
                {children}
              </ToolSubPanel>
              <div className={styles.close} onClick={() => closePanel()}>
                <AppSvg width="25px" height="25px" path={closeIcon.src} />
              </div>
            </div>
          </OutsideClickHandler>
        )}
      </div>
    );
  },
);

ToolBtn.displayName = 'ToolBtn';

export default ToolBtn;
