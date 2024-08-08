/* eslint-disable no-var */
import { Button } from 'antd';
import classNames from 'classnames';
import React, { useEffect, useState, useRef } from 'react';
import playIcon from '@/content/assests/svg/tools-panel/play.svg';
import pauseIcon from '@/content/assests/svg/tools-panel/pause.svg';
import micIcon from '@/content/assests/svg/tools-panel/mic.svg';
import { useStopwatch } from 'react-timer-hook';
import AppSvg from '@/content/components/elements/AppSvg';
import { Howl, Howler } from 'howler';

interface IPlayerProps {
  audioSrc: string;
  audioDuration: string;
}

const AudioPlayer: React.FC<IPlayerProps> = ({ audioSrc, audioDuration }) => {
  const { seconds, minutes, isRunning, start, pause, reset } = useStopwatch({
    autoStart: false,
    offsetTimestamp: new Date(),
  });

  const textM = minutes >= 10 ? `${minutes}` : `0${minutes}`;
  const textS = seconds >= 10 ? `${seconds}` : `0${seconds}`;
  const audioRef = useRef<any>(null);
  const [playingState, setPlayingState] = useState<boolean>(false);
  const [ended, setEnded] = useState<boolean>(true);

  useEffect(() => {
    if (audioRef.current === null) {
      audioRef.current = new Howl({
        src: [audioSrc],
        html5: true,
      });
    }
  }, [audioSrc]);

  const playAudio = () => {
    if (!playingState) {
      audioRef.current.play();
      start();
      setEnded(false);
      setPlayingState(true);
    } else {
      audioRef.current.pause();
      setPlayingState(false);
      pause();
    }

    audioRef.current?.on('end', () => {
      setPlayingState(false);
      pause();
      setEnded(true);
    });
  };

  return (
    <>
      <div className="tw-flex tw-items-center tw-justify-between tw-bg-iron-grey tw-w-200px tw-pl-2 tw-pr-1 tw-py-1  tw-rounded-full tw-shadow-inner">
        <div className="tw-flex tw-align-center tw-mr-2 tw-mt-2px">
          <img
            src={micIcon}
            className="tw-mr-1 tw-mt-1px tw-opacity-50 tw-w-17px tw-h-17px"
          />
          <label className="tw-text-primary-purple tw-opacity-75 tw-font-semibold ">
            Voice Note
          </label>
        </div>

        <div className="tw-font-semibold tw-opacity-75 tw-mt-1 ">
          {!ended ? textM + ':' + textS : audioDuration}
        </div>

        <button
          className=" tw-rounded-full tw-bg-white tw-flex tw-items-center tw-justify-center tw-border-sub-btn tw-shadow-inner tw-p-0 !tw-w-30px !tw-h-30px"
          onClick={() => {
            playAudio();
          }}
        >
          {' '}
          <img
            src={playingState ? pauseIcon : playIcon}
            className={!playingState ? 'tw-ml-2px' : ''}
            alt="play/pause"
          ></img>
        </button>
      </div>
    </>
  );
};

export default AudioPlayer;
