/* eslint-disable no-var */
import { Button } from 'antd';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { useStopwatch } from 'react-timer-hook';
import stopIcon from 'public/assets/svg/tools-panel/stop.svg';
import declineIcon from 'public/assets/svg/tools-panel/decline.svg';
import approveIcon from 'public/assets/svg/tools-panel/approve-voice.svg';
import AppSvg from 'components/elements/AppSvg';
import IconBtn from '../../toolsPanel/ToolBtn/components/IconBtn';
import styles from './voiceRecorder.module.scss';

import { errorMessage } from 'app/services/helpers/toastMessages';

interface IRecorderProps {
  audioSrc: string;
  setAudioSrc: (audioSrc: string) => void;
  setAudioDuration: (audioDuration: string) => void;
  duration: string;
  uploadState: string;
  setUploadState: (uploadState: string) => void;
}

const VoiceRecorder: React.FC<IRecorderProps> = ({
  audioSrc,
  setAudioSrc,
  duration,
  setAudioDuration,
  uploadState,
  setUploadState,
}) => {
  const { seconds, minutes, isRunning, start, pause, reset } = useStopwatch({
    autoStart: false,
    offsetTimestamp: new Date(),
  });

  // var drtn = null;
  const textM = minutes >= 10 ? `${minutes}` : `0${minutes}`;
  const textS = seconds >= 10 ? `${seconds}` : `0${seconds}`;

  const Recording = () => {
    try {
      navigator.mediaDevices
        .getUserMedia({ video: false, audio: true })
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream);

          setTimeout(() => {
            mediaRecorder.start();
            start();
          }, 500);

          const audioChunks: Blob[] = [];
          mediaRecorder.addEventListener('dataavailable', (event) => {
            audioChunks.push(event.data);
          });

          let accepted = false;

          mediaRecorder.addEventListener('stop', () => {
            if (accepted) {
              const audioBlob = new Blob(audioChunks);
              const audioUrl = URL.createObjectURL(audioBlob);
              setAudioSrc(audioUrl);
            }
            stream.getTracks().forEach((track) => track.stop());
            setUploadState('text');
          });

          const finishRecording = () => {
            try {
              mediaRecorder.stop();
              stop();
            } catch (err) {
              errorMessage(err);
            } finally {
              setUploadState('text');
            }
          };

          const acceptBtn = document.getElementById('accept');

          if (acceptBtn) {
            acceptBtn.onclick = () => {
              accepted = true;
              finishRecording();
            };
          }

          const cancelBtn = document.getElementById('cancel');

          if (cancelBtn) {
            cancelBtn.onclick = () => {
              accepted = false;
              finishRecording();
            };
          }
        })
        .catch((err) => {
          errorMessage(err.message);
        });
    } catch (err) {
      errorMessage(err.message);
    }
  };

  var drtn = textM + ':' + textS;

  useEffect(() => {
    setAudioDuration(drtn);
  }, [drtn]);

  useEffect(() => {
    Recording();
  }, []);

  return (
    <div className={styles.mainContainer}>
      <div className={styles.flexContainer}>
        <span className={styles.pulseAnimation}></span>
        <div className={styles.container}>
          {textM}:{textS}
        </div>
      </div>
      <div className={styles.iconWrapper}>
        <IconBtn
          id="accept"
          icon={approveIcon}
          size={'30px'}
          className1={styles.firstIcon}
        />
        <IconBtn
          onSelect={() => setUploadState('text')}
          id="cancel"
          icon={declineIcon}
          size={'30px'}
          className1={styles.secondIcon}
        />
      </div>
    </div>
  );
};

export default VoiceRecorder;
