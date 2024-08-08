export async function getImgBaseFromFrame(mediaStream: MediaStream) {
  const mediaStreamTrack = mediaStream.getVideoTracks()[0];
  const imageCapture = new ImageCapture(mediaStreamTrack);
  let imgBase64: string | null = null;

  try {
    const imageBitmap = await imageCapture.grabFrame();
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    canvas.getContext('2d')?.drawImage(imageBitmap, 0, 0);
    imgBase64 = canvas.toDataURL();
  } catch (error) {
    console.error('grabFrame() error:', error);
  } finally {
    mediaStream.getTracks().forEach((track) => {
      track.stop();
    });
  }

  return imgBase64;
}
