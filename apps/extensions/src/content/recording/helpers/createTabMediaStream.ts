const createTabMediaStream = async (
  activeTabId: number,
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

  const streamId = await new Promise<string>((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId(
      { targetTabId: activeTabId },
      (streamId) => {
        resolve(streamId);
      },
    );
  });
  //@ts-ignore
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        echoCancellation: true,
      },
    },
  });
  if (stream) {
    //Connect system mic stream with tab audio stream in one main stream
    const sysSource = audioCtx.createMediaStreamSource(stream);
    sysSource.connect(destination);

    if (audio && micSource) micSource.connect(destination);

    mainOutput.addTrack(destination.stream.getAudioTracks()[0]);
    mainOutput.addTrack(stream.getVideoTracks()[0]);

    return mainOutput;
  } else return null;
};

export default createTabMediaStream;
