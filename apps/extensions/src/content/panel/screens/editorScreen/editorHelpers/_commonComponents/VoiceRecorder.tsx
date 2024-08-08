import { Button } from 'antd';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { useStopwatch } from 'react-timer-hook';
import stopIcon from 'public/assets/svg/tools-panel/stop.svg';
import declineIcon from '@/content/assests/svg/tools-panel/decline.svg';
import approveIcon from '@/content/assests/svg/tools-panel/approve-voice.svg';
import AppSvg from '@/content/components/elements/AppSvg';
import IconBtn from '../../toolsPanel/ToolBtn/components/IconBtn';
import { errorMessage } from '@/app/services/helpers/toastMessages';

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

  const textM = minutes >= 10 ? `${minutes}` : `0${minutes}`;
  const textS = seconds >= 10 ? `${seconds}` : `0${seconds}`;

  // eslint-disable-next-line no-var
  var drtn = textM + ':' + textS;

  useEffect(() => {
    setAudioDuration(drtn);
  }, [drtn]);

  useEffect(() => {
    Recording();
  }, []);

  const Recording = () => {
    try {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream);

          setTimeout(() => {
            mediaRecorder.start();
            start();
          }, 500);

          const audioChunks: Array<any> = [];
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
            } catch (err: any) {
              errorMessage(err?.message);
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
    } catch (err: any) {
      errorMessage(err.message);
    }
  };

  return (
    <div className="tw-flex tw-items-center tw-justify-between tw-px-1 ">
      <div className="tw-flex tw-items-center ">
        <span
          className={classNames('pulse tw-mb-2px  tw-transition-all')}
        ></span>
        <div className="tw-ml-3 tw-font-semibold tw-text-xl">
          {textM}:{textS}
        </div>
      </div>
      <div className="tw-flex tw-items-center tw-justify-start">
        <IconBtn
          id="accept"
          icon={approveIcon}
          size={'30px'}
          className1={
            'tw-p-1px tw-flex tw-items-center tw-justify-center tw-bg-grey tw-rounded tw-h-30px tw-w-30px tw-bg-primary-purple '
          }
        />
        <IconBtn
          onSelect={() => setUploadState('text')}
          id="cancel"
          icon={declineIcon}
          size={'30px'}
          className1={
            'tw-p-1px tw-flex tw-items-center tw-justify-center tw-bg-gray tw-rounded-full tw-h-30px tw-w-30px '
          }
        />
      </div>
    </div>
  );
};

export default VoiceRecorder;
