import classNames from 'classnames';
import './toolBtn.scss';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import React, {
  forwardRef,
  MouseEvent,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import OutsideClickHandler from 'react-outside-click-handler';
import ToolSubPanel from './components/ToolSubPanel';
import PanelAC from '@/app/store/panel/actions/PanelAC';
import AppSvg from '@/content/components/elements/AppSvg';
import closeIcon from '../../../../../../../images/panel/common/close-icon.svg';
import { Tooltip } from 'antd';
import { tools } from '../tools';

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

    const outsideClickHandler = (e: globalThis.MouseEvent) => {
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

    return (
      <div
        className={classNames(
          ` tw-bg-trans tw-m-2px tw-relative`,
          large ? 'toolbtn-large' : 'toolbtn',
        )}
      >
        <Tooltip
          className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-cursor-pointer"
          placement={placement}
          title={toolTitle}
        >
          <div
            className={classNames(
              'tw-w-full tw-h-full  tw-flex tw-items-center tw-justify-center tw-cursor-pointer tw-text-black tw-border-solid tw-border-2',
              panel3D ? 'toolbtn-3d' : 'toolbtn-flat',
              disabled ? 'tw-opacity-30' : 'tw-opacity-100',
              active ? 'tw-bg-purple-active tw-text-white ' : 'tw-bg-white',
            )}
            onClick={clickHandler}
          >
            <div className="tw-flex tw-items-center tw-justify-center">
              <img className="tw-w-24px tw-h-24px" src={icon} />
            </div>
          </div>
        </Tooltip>

        {toolPanelState && !!children && (
          <OutsideClickHandler onOutsideClick={outsideClickHandler}>
            <div
              className={classNames(
                'tw-absolute  tw-z-10  tw-shadow-2xl tw-rounded-10px tw-flex ',

                toolTitle === tools.conversation.title ||
                  toolTitle === tools.emoji.title ||
                  toolTitle === tools.watermark.title ||
                  toolTitle === tools.saving.title
                  ? 'tw-top-250negative'
                  : 'tw-top-0',
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
              <div className={'close'} onClick={() => closePanel()}>
                <img src={closeIcon}></img>
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
