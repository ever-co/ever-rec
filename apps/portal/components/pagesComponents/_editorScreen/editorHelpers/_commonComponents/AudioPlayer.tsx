/* eslint-disable @next/next/no-img-element */
import { Button } from 'antd';
import classNames from 'classnames';
import React, { useEffect, useState, useRef } from 'react';
import playIcon from 'public/assets/svg/tools-panel/play.svg';
import pauseIcon from 'public/assets/svg/tools-panel/pause.svg';
import micIcon from 'public/assets/svg/tools-panel/mic.svg';
import { Howl, Howler } from 'howler';
import { useStopwatch } from 'react-timer-hook';
import AppSvg from 'components/elements/AppSvg';
import styles from './audioPlayer.module.scss';

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
  const audioRef = useRef<Howl | null>(null);
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
      <div className={styles.audioContainer}>
        <div className={styles.iconWrapper}>
          <AppSvg path={micIcon.src} size="17px" className={styles.icon} />
          <label className={styles.label}>Voice Note</label>
        </div>

        <div className={styles.duration}>
          {!ended ? textM + ':' + textS : audioDuration}
        </div>

        <Button
          className={styles.playButton}
          onClick={() => {
            playAudio();
          }}
        >
          {' '}
          <img
            src={playingState ? pauseIcon.src : playIcon.src}
            className={!playingState ? styles.spacing : ''}
            alt="play/pause"
          ></img>
        </Button>
      </div>
    </>
  );
};

export default AudioPlayer;
