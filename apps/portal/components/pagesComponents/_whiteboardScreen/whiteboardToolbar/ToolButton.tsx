/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable jsx-a11y/alt-text */
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import OutsideClickHandler from 'react-outside-click-handler';
import Tooltip from 'antd/lib/tooltip';
import AppSvg from 'components/elements/AppSvg';
import PanelAC from 'app/store/panel/actions/PanelAC';
import SubPanel from './customToolBtns/SubPanel';

interface IToolButton {
  icon: string;
  iconSize?: { width: number; height: number };
  active?: boolean;
  disabled?: boolean;
  children?: JSX.Element | JSX.Element[];
  onSelect?: () => void;
  title?: string;
  toolTitle?: string;
  className?: string;
  isOpenEditTool?: boolean;
  onSubpanelClose?: () => void;
}

const ToolButton: React.FC<IToolButton> = (props: IToolButton) => {
  const {
    icon,
    iconSize,
    active,
    disabled,
    children,
    onSelect,
    title,
    toolTitle,
    className,
    isOpenEditTool,
    onSubpanelClose,
  } = props;
  const dispatch = useDispatch();
  const [toolPanelState, setToolPanelState] = useState<boolean>(false);

  const currentTool: any = useSelector(
    (state: RootStateOrAny) => state.panel.currentTool,
  );

  const clickHandler = (e: React.MouseEvent) => {
    if (!disabled) {
      onSelect?.();
      openPanel();
    }
  };

  const openPanel = () => {
    dispatch(PanelAC.setCurrentTool({ name: title, clicked: true }));
    setToolPanelState(true);
  };
  const closePanel = () => {
    setToolPanelState(false);
    onSubpanelClose && onSubpanelClose();
  };

  const outsideClickHandler = (e: MouseEvent) => {
    if (currentTool?.clicked == true) {
      if (
        !(e.target as HTMLElement).classList.contains('app-selectable') &&
        !(e.target as HTMLElement).classList.contains('ant-select-item') &&
        !(e.target as HTMLElement).classList.contains(
          'ant-select-item-option-content',
        )
      ) {
        closePanel();
        dispatch(PanelAC.setCurrentTool({ name: null, clicked: false }));
      }
    } else {
      dispatch(PanelAC.setCurrentTool({ name: title, clicked: true }));
    }
  };

  useEffect(() => {
    if (isOpenEditTool) {
      openPanel();
    } else {
      closePanel();
    }
  }, [isOpenEditTool]);

  return (
    <>
      <Tooltip
        className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-cursor-pointer"
        placement={'right'}
        title={toolTitle}
      >
        <div
          onClick={clickHandler}
          className={classNames(
            `hover:tw-bg-whiteboard-purple tw-text-white tw-m-2px tw-h-40px tw-w-40px tw-w-full  tw-rounded  tw-flex tw-items-center tw-justify-center tw-cursor-pointer  hover:!tw-text-white tw-transition-all tw-duration-100 `,
            className,
            active
              ? 'tw-bg-whiteboard-purple tw-text-white'
              : 'tw-bg-white  tw-text-black ',
          )}
        >
          <AppSvg
            // @ts-ignore
            path={icon.src}
            width={iconSize?.width ? iconSize?.width + 'px' : 18 + 'px'}
            height={iconSize?.height ? iconSize?.height + 'px' : 16 + 'px'}
          />
        </div>
      </Tooltip>
      {toolPanelState && !!children && (
        <OutsideClickHandler onOutsideClick={outsideClickHandler}>
          <div
            className={classNames(
              '!tw-bg-white tw-absolute tw-z-10 tw-shadow-2xl tw-rounded',
            )}
            style={{
              left: '100px',
              borderRadius: '4px',
              background: '#FFFFFF',
            }}
          >
            <SubPanel>{children}</SubPanel>
          </div>
        </OutsideClickHandler>
      )}
    </>
  );
};
export default ToolButton;
