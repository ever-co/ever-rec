import React, { useEffect, useRef, useState } from 'react';
import '@/content/content';
import interact from 'interactjs';
import AppButton from '@/content/components/controls/appButton/AppButton';
import classNames from 'classnames';
import './select-area.scss';
import Logo from '@/content/components/elements/Logo';
import { successMessage } from '@/app/services/helpers/toastMessages';

export type CaptureAreaActionType = 'save' | 'copy' | 'download';

interface ISelectedAreaProps {
  changeAreaState: (state: boolean) => void;
  captureAreaHandler: ({
    areaX,
    areaY,
    areaWidth,
    areaHeight,
    action,
  }: {
    areaX: number;
    areaY: number;
    areaWidth: number;
    areaHeight: number;
    action: CaptureAreaActionType;
  }) => void;
}

const SelectArea: React.FC<ISelectedAreaProps> = ({
  changeAreaState,
  captureAreaHandler,
}) => {
  const sideBoxMargin = 15 * window.devicePixelRatio;
  const info = useRef<HTMLDivElement | null>(null);
  const area = useRef<HTMLDivElement | null>(null);
  const sideBox = useRef<HTMLDivElement | null>(null);
  const [areaX, setX] = useState(0);
  const [areaY, setY] = useState(0);
  const [areaWidth, setWidth] = useState(0);
  const [areaHeight, setHeight] = useState(0);
  const [invisible, setInvisible] = useState(true);
  const [sideBoxClasses, setSideBoxClasses] = useState(
    `tw--right-36 tw-bottom-0`,
  );
  const [finish, setFinish] = useState(false);

  useEffect(() => {
    document.addEventListener('mousedown', clickListener);
  }, []);

  useEffect(() => {
    if (info.current && areaWidth && areaHeight) {
      info.current.textContent = `${areaWidth} x ${areaHeight}`;
    }
    if (sideBox.current) {
      const offsetToRight =
        window.innerWidth -
        (areaWidth + areaX + sideBoxMargin + sideBox.current.clientWidth);
      const offsetToBottom =
        window.innerHeight -
        (areaHeight + areaY + sideBoxMargin + sideBox.current.clientHeight);
      const offsetToTop = areaY - sideBoxMargin - sideBox.current.clientHeight;
      const offsetToLeft = areaX - sideBoxMargin - sideBox.current.clientWidth;

      // Toolbox positioning
      if (offsetToRight > -10) {
        setSideBoxClasses(`tw--right-32 tw-bottom-0`);
      } else if (offsetToBottom > -10) {
        setSideBoxClasses(`tw--bottom-40`);
      } else if (offsetToLeft > -10) {
        setSideBoxClasses(`tw--left-32 tw-bottom-0`);
      } else if (offsetToTop > -20) {
        setSideBoxClasses(`tw-right-0 tw--top-40`);
      } else {
        setSideBoxClasses(`tw-left-0 tw-bottom-0`);
      }
    }
  }, [
    areaX,
    areaY,
    areaWidth,
    areaHeight,
    Math.round(window.devicePixelRatio * 100),
  ]);

  const clickListener = (e: MouseEvent): void => {
    document.removeEventListener('mousedown', clickListener);
    setInvisible(false);
    const { clientX, clientY } = e;

    const areaEl: HTMLDivElement | null = area.current;
    if (areaEl) {
      areaEl.style.transform =
        'translate(' + clientX + 'px, ' + clientY + 'px)';
      areaEl.setAttribute('data-x', clientX.toString());
      areaEl.setAttribute('data-y', clientY.toString());
      setX(clientX);
      setY(clientY);
      document.addEventListener('mousemove', resizeListener);
    }
  };

  const resizeListener = (e: MouseEvent): void => {
    document.addEventListener('mouseup', stopListener);
    const { clientX, clientY } = e;

    // Restrict initial drawing to the bounds of the client
    // Needed for dual monitor setups
    const maxWidth = window.visualViewport?.width || window.innerWidth;
    const maxHeight = window.visualViewport?.height || window.innerHeight;
    if (
      clientX >= maxWidth ||
      clientX < 0 ||
      clientY < 0 ||
      clientY > maxHeight
    )
      return;

    const areaEl: HTMLDivElement | null = area.current;
    if (areaEl) {
      const x = parseFloat(areaEl.getAttribute('data-x') || '0');
      const y = parseFloat(areaEl.getAttribute('data-y') || '0');
      const width = clientX - x;
      const height = clientY - y;
      const dataY = y - Math.abs(height);
      const dataX = x - Math.abs(width);

      let newX = x;
      let newY = y;
      if (width < 0 && height > 0) {
        newX = dataX;
        areaEl.style.transform = 'translate(' + dataX + 'px, ' + y + 'px)';
      } else if (width > 0 && height < 0) {
        newY = dataY;
        areaEl.style.transform = 'translate(' + x + 'px, ' + dataY + 'px)';
      } else if (width < 0 && height < 0) {
        newY = dataY;
        newX = dataX;
        areaEl.style.transform = 'translate(' + dataX + 'px, ' + dataY + 'px)';
      }
      areaEl.style.width = Math.abs(width) + 'px';
      areaEl.style.height = Math.abs(height) + 'px';

      setX(newX);
      setY(newY);
      setWidth(Math.abs(width));
      setHeight(Math.abs(height));
    }
  };

  const stopListener = (): void => {
    setFinish(true);
    document.removeEventListener('mousemove', resizeListener);
    document.removeEventListener('mouseup', stopListener);
  };

  useEffect(() => {
    if (finish) {
      const areaEl: HTMLDivElement | null = area.current;
      if (areaEl) {
        areaEl.setAttribute('data-x', areaX.toString());
        areaEl.setAttribute('data-y', areaY.toString());
      }
    }
  }, [finish]);

  const dragMoveListener = (event: any): void => {
    const target: any = event.target;
    if (target) {
      const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
      const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
      target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      target.setAttribute('data-x', x);
      target.setAttribute('data-y', y);
      setX(x);
      setY(y);
    }
  };

  interact('.resize-drag')
    .resizable({
      edges: { right: true, left: true, bottom: true, top: true },
      invert: 'none',
      listeners: {
        move(event) {
          const target = event.target;
          let x = parseFloat(target.getAttribute('data-x')) || 0;
          let y = parseFloat(target.getAttribute('data-y')) || 0;
          target.style.width = event.rect.width + 'px';
          target.style.height = event.rect.height + 'px';

          x += event.deltaRect.left;
          y += event.deltaRect.top;

          target.style.transform = 'translate(' + x + 'px,' + y + 'px)';
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
          setX(x);
          setY(y);
          setWidth(Math.round(event.rect.width));
          setHeight(Math.round(event.rect.height));
        },
      },
      modifiers: [
        interact.modifiers.restrictEdges({
          outer: 'parent',
        }),
      ],
      inertia: false,
    })
    .draggable({
      listeners: { move: dragMoveListener },
      inertia: false,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: true,
        }),
      ],
    });

  const closeHandler = (): void => {
    changeAreaState(false);
  };

  const captureHandler = (action: CaptureAreaActionType): void => {
    //! Adjust device pixel ratio before capturing
    captureAreaHandler({
      areaX: areaX * window.devicePixelRatio,
      areaY: areaY * window.devicePixelRatio,
      areaWidth: areaWidth * window.devicePixelRatio,
      areaHeight: areaHeight * window.devicePixelRatio,
      action,
    });
  };

  return (
    <div className="select-area-overlay tw-fixed tw-top-0 tw-left-0 tw-w-full tw-h-full ">
      {invisible ? (
        <div className="tw-bg-opacity-60 tw-flex tw-items-center tw-justify-center tw-w-full tw-h-full tw-bg-black tw-bg-opacity-40">
          <h2 className="tw-text-white tw-text-center tw-font-normal tw-text-2xl tw-font-sans">
            Select area
          </h2>
        </div>
      ) : (
        <div
          ref={area}
          style={{ boxShadow: '-1px 1px 5920px 5920px rgba(0,0,0,0.40)' }}
          className={classNames(
            'tw-border-2 tw-border-dashed tw-border-white tw-w-3 tw-h-3 resize-drag tw-absolute ',
            { 'tw-invisible': invisible },
          )}
        >
          <div className="tw-relative tw-w-full tw-h-full">
            <div
              ref={info}
              className="tw-left-0 tw--top-8 tw-absolute tw-px-2 tw-py-1 tw-font-semibold tw-text-white tw-bg-app-grey-darker tw-text-xs tw-font-sans tw-bg- tw-rounded-md"
            ></div>

            <div
              ref={sideBox}
              className={`tw-w-28 ${sideBoxClasses} tw-absolute tw-font-semibold tw-font-sans tw-flex tw-flex-col tw-p-10px tw-bg-toolbox-light tw-rounded-5 tw-text-xs`}
            >
              <Logo type="default" className="tw-mb-13px" />

              <AppButton
                full
                className="tw-pl-1 tw-pr-1 tw-pt-1px tw-pb-1px tw-mb-2 tw-rounded-2xl tw-text-white"
                bgColor="tw-bg-select-area"
                onClick={() => captureHandler('copy')}
              >
                <div
                  className="tw-text-xs tw-m-2px"
                  onClick={() => successMessage('Copied to clipboard')}
                >
                  {' '}
                  Copy
                </div>
              </AppButton>

              <AppButton
                full
                className="tw-pl-1 tw-pr-1 tw-pt-1px tw-pb-1px tw-mb-2 tw-rounded-2xl"
                onClick={() => captureHandler('save')}
              >
                <div className="tw-text-xs tw-m-2px"> Capture</div>
              </AppButton>

              <AppButton
                full
                outlined
                className="tw-pl-1 tw-pr-1 tw-pt-1px tw-pb-1px  tw-border-app-grey tw-rounded-2xl "
                bgColor="tw-bg-app-grey-darker"
                onClick={closeHandler}
              >
                <div className="tw-text-xs tw-m-2px">Cancel</div>
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectArea;
