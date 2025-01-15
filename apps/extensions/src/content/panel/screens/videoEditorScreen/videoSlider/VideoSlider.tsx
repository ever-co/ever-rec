import React, { useEffect, useState } from 'react';
import Nouislider from 'nouislider-react';
import 'nouislider/dist/nouislider.css';
import EditorButton from '../editorButton/EditorButton';

const NouisliderReact = Nouislider as any;

interface IVideoSlider {
  videoStart: string;
  videoTrimmed: boolean;
  blobs: Blob[];
  applyTrim: (newLength: number) => void;
  resetVideo: () => void;
  uploadBlocked?: boolean;
}

const VideoSlider: React.FC<IVideoSlider> = ({
  videoStart,
  videoTrimmed,
  blobs,
  applyTrim,
  resetVideo,
  uploadBlocked = false,
}) => {
  const seconds = blobs.length;
  const [ref, setRef] = useState<any>(null);
  const [stringLength, setStringLength] = useState<string>(timestamp(seconds));

  const handleSlide = (val: string[]) => {
    const value = +val[0];
    setStringLength(timestamp(value));
  };

  const trim = () => {
    if (!ref && !ref.noUiSlider) return;

    const value = +ref.noUiSlider.get();
    applyTrim(value);
  };

  const cancel = () => {
    if (ref && ref.noUiSlider) {
      ref.noUiSlider.set(seconds);
    }
    setStringLength(timestamp(seconds));
  };

  const reset = () => {
    resetVideo();
  };

  useEffect(() => {
    if (!blobs) return;

    setStringLength(timestamp(seconds));
  }, [blobs]);

  const trimDisabled = () => {
    if (!ref && !ref?.noUiSlider) return false;
    const value = +ref.noUiSlider.get()[0];
    return value === seconds || value === 0;
  };

  return (
    <div className="tw-text-center">
      <p className="tw-font-bold tw-text-[16px] tw-leading-none tw-text-primary-purple">
        Edit your recording
      </p>
      <p className="tw-text-grey-light tw-text-sm tw-m-[-10px] tw-text-[14px]">
        Add the finishing touches to your video.
      </p>
      <div>
        <div className="tw-flex tw-justify-between tw-mb-4 tw-mt-8">
          <div className="">
            <label htmlFor="tstart" className="tw-font-bold tw-text-[16px]">
              Start:
            </label>
            <input
              name="tstart"
              className="tw-bg-white tw-w-16 tw-font-bold"
              disabled
              value={videoStart}
            />
          </div>
          <div className="">
            <label
              htmlFor="tend"
              className="tw-text-primary-purple tw-font-bold tw-text-[16px]"
            >
              End:
            </label>
            <input
              name="tend"
              className="tw-bg-white tw-w-16 tw-font-bold tw-text-primary-purple"
              disabled
              value={stringLength}
            />
          </div>
        </div>
        <NouisliderReact
          instanceRef={(instance) => {
            if (instance && !ref) {
              setRef(instance);
            }
          }}
          onSlide={handleSlide}
          start={seconds}
          step={1}
          connect={[true, false]}
          range={{
            min: 0,
            max: seconds,
          }}
        />
        <div className="tw-flex tw-justify-evenly tw-mt-6">
          <EditorButton
            title="Apply"
            color="tw-bg-primary-purple"
            textcolor="tw-text-white"
            onClick={trim}
            disabled={trimDisabled() || uploadBlocked}
            lowerOpacity
          />
          <EditorButton
            title="Cancel"
            color="tw-bg-blue-grey"
            textcolor="tw-text-black"
            onClick={cancel}
          />
          <EditorButton
            title="Reset"
            color="tw-bg-blue-grey"
            textcolor="tw-text-black"
            onClick={reset}
            disabled={!videoTrimmed || uploadBlocked}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoSlider;

function timestamp(value: number) {
  if (value < 1) {
    return '00:00:00';
  }
  const sec_num = value;
  let hours: any = Math.floor(sec_num / 3600);
  let minutes: any = Math.floor((sec_num - hours * 3600) / 60);
  let seconds: any = sec_num - hours * 3600 - minutes * 60;

  if (hours < 10) {
    hours = '0' + hours;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  if (seconds < 10) {
    seconds = '0' + seconds;
  }
  return hours + ':' + minutes + ':' + seconds;
}
