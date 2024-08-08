import browser from '@/app/utilities/browser';

interface IDesktopMedia {
  streamId: string;
  options: chrome.desktopCapture.StreamOptions;
}

const createDesktopMediaStream = async (
  fromEditor: boolean | undefined,
  audio = true,
): Promise<MediaStream | null> => {
  const mainOutput = new MediaStream();
  const audioCtx = new AudioContext();
  const destination = audioCtx.createMediaStreamDestination();

  let micSource = null;
  if (audio) {
    try {
      const micScream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      micSource = audioCtx.createMediaStreamSource(micScream);
    } catch (error) {
      console.log(error);
    }
  }

  const { streamId, options } = await new Promise<IDesktopMedia>(
    (resolve, reject) => {
      browser.desktopCapture.chooseDesktopMedia(
        [!fromEditor ? 'screen' : 'tab', 'audio'],
        (streamId, options) => {
          resolve({
            streamId,
            options,
          });
        },
      );
    },
  );

  if (streamId) {
    let audioConstraint;
    if (!options.canRequestAudioTrack) {
      audioConstraint = false;
    } else {
      audioConstraint = {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId,
        },
      };
    }

    // @ts-ignore
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        //@ts-ignore
        mandatory: {
          chromeMediaSource: 'screen',
          chromeMediaSourceId: streamId,
        },
      },
      audio: audioConstraint,
    });

    if (stream) {
      if (options.canRequestAudioTrack) {
        const sysSource = audioCtx.createMediaStreamSource(stream);
        sysSource.connect(destination);
      }

      if (audio && micSource) micSource.connect(destination);

      // if there is no connected audio source we connect an empty audio source that bugs the recording
      if (options.canRequestAudioTrack || micSource) {
        mainOutput.addTrack(destination.stream.getAudioTracks()[0]);
      }
      mainOutput.addTrack(stream.getVideoTracks()[0]);

      return mainOutput;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

export default createDesktopMediaStream;
