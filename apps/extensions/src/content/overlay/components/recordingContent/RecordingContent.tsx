import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import ControllerButton from './controllerButton/ControllerButton';
import ControllerSlider from './controllerSlider/ControllerSlider';
import CanvasDraw from 'react-canvas-draw';
import { ColorResult, GithubPicker } from 'react-color';
import useWindowSize from '@/content/utilities/hooks/useWindowSize';
import '@/content/overlay/components/recordingContent/recording-content.scss';
import Draggable from 'react-draggable';

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
  const mainContainerGlobal: any = useRef();
  const penSlider: any = useRef();
  const colorPickerIcon: any = useRef();
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

  const leaveMouseHandler = (): void => {
    setTogglePicker(false);
  };

  const mouseOverHandler = () => {
    penSlider.current.classList.add('show-slider');
  };

  const outMouseHandler = () => {
    penSlider.current.classList.remove('show-slider');
  };

  const inputHandler = (event: ChangeEvent): void => {
    //@ts-ignore
    setInputValue(Number(event.target.value));
  };

  return (
    <div
      ref={mainContainerGlobal}
      className="remove-pointer-events rec-main"
    >
      <Draggable
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
            `${
              !fromEditor
                ? 'rec-container'
                : ' rec-container-editor'
            }`,
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
              ></ControllerButton>
              <ControllerButton
                className={'stopButton'}
                onClick={pausePlayClickHandler}
                imgSource={playPauseImgSource}
              ></ControllerButton>
              {!microphoneMuted && microphoneEnabled && (
                <ControllerButton
                  className="micButton"
                  onClick={() => muteOrUnmute(true)}
                  imgSource="unmute.svg"
                />
              )}
              {(microphoneMuted || !microphoneEnabled) && (
                <ControllerButton
                  className="micButton"
                  onClick={() => muteOrUnmute(false)}
                  imgSource="mute.svg"
                  disabled={!microphoneEnabled}
                ></ControllerButton>
              )}
              <ControllerButton
                className={'binButton'}
                onClick={binButtonClickHandler}
                imgSource={'bin.svg'}
              ></ControllerButton>
              <ControllerButton
                className={'penButton'}
                imgSource={penImgSource}
                disabled={fromEditor}
                onMouse={mouseOverHandler}
                outMouse={outMouseHandler}
                onClick={penButtonClickHandler}
              ></ControllerButton>
              <ControllerButton
                className={'eraserButton'}
                onClick={eraserButtonClickHandler}
                imgSource={eraserImgSource}
              ></ControllerButton>
              <ControllerSlider
                penSliderRef={penSlider}
                imageUrl={'slider-track.svg'}
                inputValue={inputValue}
                onMouseHandler={mouseOverHandler}
                outMouseHandler={outMouseHandler}
                onChangeSlider={inputHandler}
              ></ControllerSlider>
              <div className="colorPicker" onClick={handleColorPicker}>
                <div ref={colorPickerIcon} className="colorPicker-icon"></div>
                {togglePicker && (
                  <GithubPicker
                    onChange={(color: ColorResult) => {
                      setColorPicker(color), setTogglePicker(false);
                    }}
                    colors={colors}
                    width="187px"
                    className={'color-picker-github'}
                    triangle={'hide'}
                  ></GithubPicker>
                )}
              </div>
            </div>
          </div>
        </div>
      </Draggable>

      <CanvasDraw
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
      ></CanvasDraw>
    </div>
  );
};

export default RecordingContent;
