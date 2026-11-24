import React, {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  UIEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import ControllerButton from './controllerButton/ControllerButton';
import ControllerSlider from './controllerSlider/ControllerSlider';
import CanvasDraw from 'react-canvas-draw';
import { ColorResult, GithubPicker } from 'react-color';
import useWindowSize from '@/content/utilities/hooks/useWindowSize';
import '@/content/overlay/components/recordingContent/recording-content.scss';
import Draggable from 'react-draggable';
import { useTranslation } from 'react-i18next';

const DraggableReact = Draggable as any;

const CanvasDrawReact = CanvasDraw as any;

const GithubPickerReact = GithubPicker as any;

const colors = [
  '#B80000',
  '#DB3E00',
  '#FCCB00',
  '#008B02',
  '#006B76',
  '#1273DE',
  '#004DCF',
  '#5300EB',
  '#be1f1f',
  '#d95c2b',
  '#ffdc4c',
  '#318d33',
  '#2f8d97',
  '#7ba0c9',
  '#88a2cf',
  '#9d74e7',
  '#e97b7b',
  '#eb8f6b',
  '#f7e8ab',
  '#96d797',
  '#b3c7dc',
];

interface IRecordingContentProps {
  fromEditor: boolean;
  recordingTime: string | null;
  recordStatus: string | undefined;
  microphoneMuted: boolean;
  microphoneEnabled: boolean;
  muteOrUnmute: (mute: boolean) => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onCancelRecording: () => void;
}

const RecordingContent: React.FC<IRecordingContentProps> = ({
  fromEditor,
  recordingTime,
  recordStatus,
  microphoneMuted,
  microphoneEnabled,
  muteOrUnmute,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onCancelRecording,
}) => {
  const { t } = useTranslation();
  const canMute = !microphoneMuted && microphoneEnabled;
  const mainContainerGlobal: any = useRef();
  const penSlider: any = useRef();
  const colorPickerIcon: any = useRef();
  const colorPickerContainer = useRef<HTMLDivElement>(null);
  const { height, width } = useWindowSize();
  const [playPauseImgSource, setPlayPauseImgSource] =
    useState('pause-light.svg');
  const [penImgSource, setPenImgSource] = useState('pen-inactive.svg');
  const [eraserImgSource, setEraserImgSource] = useState('undo-inactive.svg');
  const [canvasStyle, setCanvasStyle] = useState<any>({ cursor: 'default' });
  const [canvas, setCanvas] = useState<CanvasDraw | null>(null);
  const [togglePicker, setTogglePicker] = useState(false);
  const [colorPicker, setColorPicker] = useState<ColorResult>();
  const [inputValue, setInputValue] = useState(5);

  useEffect(() => {
    if (recordStatus == 'play') {
      setPlayPauseImgSource('pause-light.svg');
    } else if (recordStatus == 'pause') {
      setPlayPauseImgSource('play.svg');
    }
  }, [recordStatus]);

  useEffect(() => {
    if (!colorPicker) {
      colorPickerIcon.current.style.background = '#383c44';
    } else {
      colorPickerIcon.current.style.background = colorPicker.hex;
    }
  }, [colorPicker]);

  useEffect(() => {
    if (!togglePicker) {
      return;
    }
    // react-color renders each colour as a focusable <div title="#hex"> that
    // picks on Enter but has no role. As a button, its title is its name.
    colorPickerContainer.current
      ?.querySelectorAll('.color-picker-github [title]')
      .forEach((swatch) => swatch.setAttribute('role', 'button'));
  }, [togglePicker]);

  const binButtonClickHandler = (): void => {
    onCancelRecording();
  };

  const stopButtonClickHandler = (): void => {
    onStopRecording();
  };

  const pausePlayClickHandler = (): void => {
    if (playPauseImgSource == 'pause-light.svg') {
      onPauseRecording();
    } else if (playPauseImgSource == 'play.svg') {
      onResumeRecording();
    }
  };

  const eraserButtonClickHandler = (): void => {
    if (canvas) {
      canvas.undo();
      const lines = canvas.getSaveData().includes('{"lines":[]');
      if (lines) {
        setEraserImgSource('undo-inactive.svg');
        setCanvas(null);
      }
    }
  };

  const penButtonClickHandler = (): void => {
    if (penImgSource == 'pen-inactive.svg') {
      setPenImgSource('pen-active.svg');
      mainContainerGlobal?.current?.classList.remove('remove-pointer-events');
      mainContainerGlobal?.current?.classList.add('set-pointer-events');
      setCanvasStyle({ cursor: 'crosshair' });
    } else if (penImgSource == 'pen-active.svg') {
      setPenImgSource('pen-inactive.svg');
      setCanvasStyle({ cursor: 'default' });
      mainContainerGlobal?.current?.classList.add('remove-pointer-events');
      mainContainerGlobal?.current?.classList.remove('set-pointer-events');
    }
  };

  const handleColorPicker = (): void => {
    if (!togglePicker) {
      setTogglePicker(true);
    } else if (togglePicker) {
      setTogglePicker(false);
    }
  };

  const colorButtonKeyDownHandler = (
    event: KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Space would otherwise scroll the host page.
      event.preventDefault();
      // A held key repeats keydown. Toggle on the first one only.
      if (!event.repeat) {
        handleColorPicker();
      }
    }
  };

  const colorPickerKeyDownHandler = (
    event: KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (!togglePicker) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setTogglePicker(false);
      colorPickerIcon.current?.focus();
      return;
    }
    const target = event.target as HTMLElement;
    // react-color picks on Enter only; Space is the other button key.
    if (event.key === ' ' && target.closest('.color-picker-github')) {
      event.preventDefault();
      if (!event.repeat) {
        target.click();
      }
    }
  };

  const pickColorHandler = (color: ColorResult, event?: UIEvent): void => {
    setColorPicker(color);
    setTogglePicker(false);
    // A key press removes the focused colour with the picker, so focus goes
    // back to the swatch. A mouse click (detail >= 1) leaves focus as it was.
    if (!event?.detail) {
      colorPickerIcon.current?.focus();
    }
  };

  const leaveMouseHandler = (): void => {
    setTogglePicker(false);
  };

  const mouseOverHandler = () => {
    penSlider.current.classList.add('show-slider');
  };

  const outMouseHandler = () => {
    penSlider.current.classList.remove('show-slider');
  };

  // Keyboard users never hover, so the slider also shows while the pen button
  // or the slider has keyboard focus. Mouse focus (not :focus-visible) keeps
  // the hover behaviour above.
  const focusPenToolsHandler = (event: FocusEvent<HTMLElement>) => {
    penSlider.current.classList.toggle(
      'show-slider-keyboard',
      event.target.matches(':focus-visible'),
    );
  };

  const blurPenToolsHandler = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    // Keep it shown while focus moves between the pen button and the slider:
    // the browser drops focus on an element that is hidden by then.
    if (
      next &&
      (penSlider.current.contains(next) || next.classList.contains('penButton'))
    ) {
      return;
    }
    penSlider.current.classList.remove('show-slider-keyboard');
  };

  const inputHandler = (event: ChangeEvent): void => {
    //@ts-ignore
    setInputValue(Number(event.target.value));
  };

  return (
    <div ref={mainContainerGlobal} className="remove-pointer-events rec-main">
      <DraggableReact
        bounds={{
          left: 0,
          bottom: 0,
          right: window.innerWidth - (fromEditor ? 250 : 370),
          top: -window.innerHeight + 100,
        }}
        cancel=".penSlider, .main-buttons"
      >
        <div
          className={classNames(
            `${!fromEditor ? 'rec-container' : ' rec-container-editor'}`,
          )}
          onMouseLeave={leaveMouseHandler}
          id="small-rec"
        >
          <div className="content">
            <div className="timer">
              {recordingTime ? recordingTime : '00:00'}
            </div>
            <div className="line"></div>
            <div className="main-buttons">
              <ControllerButton
                className={'stopButton'}
                onClick={stopButtonClickHandler}
                subFoldersWithPrefix="/recordingWindowIcons"
                imgSource="button-stop-red-fill.svg"
                label={t('ext.recordingControls.stop')}
              ></ControllerButton>
              <ControllerButton
                className={'stopButton'}
                onClick={pausePlayClickHandler}
                imgSource={playPauseImgSource}
                label={
                  playPauseImgSource == 'play.svg'
                    ? t('ext.recordingControls.resume')
                    : t('ext.recordingControls.pause')
                }
              ></ControllerButton>
              {/* One mounted button, so keyboard focus survives a mute toggle. */}
              <ControllerButton
                className="micButton"
                onClick={() => muteOrUnmute(canMute)}
                imgSource={canMute ? 'unmute.svg' : 'mute.svg'}
                disabled={!microphoneEnabled}
                label={
                  canMute
                    ? t('ext.recordingControls.mute')
                    : t('ext.recordingControls.unmute')
                }
              ></ControllerButton>
              <ControllerButton
                className={'binButton'}
                onClick={binButtonClickHandler}
                imgSource={'bin.svg'}
                label={t('ext.recordingControls.cancel')}
              ></ControllerButton>
              <ControllerButton
                className={'penButton'}
                imgSource={penImgSource}
                disabled={fromEditor}
                onMouse={mouseOverHandler}
                outMouse={outMouseHandler}
                onClick={penButtonClickHandler}
                onFocus={focusPenToolsHandler}
                onBlur={blurPenToolsHandler}
                label={t('ext.recordingControls.pen')}
                pressed={penImgSource == 'pen-active.svg'}
              ></ControllerButton>
              {/* Right after the pen button, so Tab reaches it while it shows.
                  It is absolutely positioned, so the order does not move it. */}
              <ControllerSlider
                penSliderRef={penSlider}
                imageUrl={'slider-track.svg'}
                inputValue={inputValue}
                label={t('ext.recordingControls.brushSize')}
                onMouseHandler={mouseOverHandler}
                outMouseHandler={outMouseHandler}
                onFocusHandler={focusPenToolsHandler}
                onBlurHandler={blurPenToolsHandler}
                onChangeSlider={inputHandler}
              ></ControllerSlider>
              <ControllerButton
                className={'eraserButton'}
                onClick={eraserButtonClickHandler}
                imgSource={eraserImgSource}
                label={t('ext.recordingControls.undo')}
              ></ControllerButton>
              {/* The whole circle stays the mouse target; the inner dot is the
                  keyboard button, so the colours are not inside a button. */}
              <div
                ref={colorPickerContainer}
                className="colorPicker"
                onClick={handleColorPicker}
                onKeyDown={colorPickerKeyDownHandler}
              >
                <div
                  ref={colorPickerIcon}
                  className="colorPicker-icon"
                  role="button"
                  tabIndex={0}
                  aria-label={t('ext.recordingControls.penColor')}
                  aria-expanded={togglePicker}
                  onKeyDown={colorButtonKeyDownHandler}
                ></div>
                {togglePicker && (
                  <GithubPickerReact
                    onChange={pickColorHandler}
                    colors={colors}
                    width="187px"
                    className={'color-picker-github'}
                    triangle={'hide'}
                  ></GithubPickerReact>
                )}
              </div>
            </div>
          </div>
        </div>
      </DraggableReact>

      <CanvasDrawReact
        onChange={(canvas: CanvasDraw) => {
          setCanvas(canvas), setEraserImgSource('undo-active.svg');
        }}
        brushColor={colorPicker?.hex}
        className={'canvasFree'}
        hideInterface={true}
        hideGrid={true}
        backgroundColor={'transparent'}
        canvasWidth={width}
        canvasHeight={height}
        brushRadius={inputValue}
        style={{
          cursor: `${canvasStyle.cursor}`,
          position: 'absolute',
          zIndex: 9999900,
        }}
      ></CanvasDrawReact>
    </div>
  );
};

export default RecordingContent;
