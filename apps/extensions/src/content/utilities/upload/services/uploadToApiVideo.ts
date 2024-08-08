import {
  PlaybackStatusEnum,
  VideoServicesEnum,
} from '@/app/enums/StreamingServicesEnums';
import { AppMessagesEnum } from '@/app/messagess';
import { directUpload } from '@/app/services/api/videoStreaming';
import { saveVideoStreamData } from '@/app/services/videosStreaming';
import { VideoUploader } from '@api.video/video-uploader';
import { sendRuntimeMessage } from '../../scripts/sendRuntimeMessage';

const API_HOST = process.env.API_VIDEO_SERVICE_HOST || 'sandbox.api.video';

const uploadToApiVideo = async (
  file: File,
  videoTitle: string,
  videoDuration: string,
  videoId?: string,
) => {
  try {
    const upload = await directUpload(VideoServicesEnum.API_VIDEO);
    const assetId = upload.id;
    const uploadToken = upload.token;

    const uploader = new VideoUploader({
      file,
      uploadToken,
      videoId: assetId,
      apiHost: API_HOST,
    });

    uploader.onProgress((event) => {
      const percentage = (
        (event.uploadedBytes / event.totalBytes) *
        100
      ).toFixed();
      sendRuntimeMessage({
        action: AppMessagesEnum.streamServiceUploadProgressSW,
        payload: { percentage },
      });
    });

    const res = await uploader.upload();

    // Package has outdated types
    const resAssets = res.assets as any;
    const downloadUrl = resAssets?.mp4 || '';

    const editorVideo = await saveVideoStreamData(
      {
        videoTitle,
        videoDuration,
        serviceType: VideoServicesEnum.API_VIDEO,
        assetId,
        thumbnailUrl: res.assets?.thumbnail || '',
        playbackUrl: res.assets?.hls || '',
        playbackStatus: PlaybackStatusEnum.PREPARING,
        downloadStatus: PlaybackStatusEnum.PREPARING,
        downloadUrl,
      },
      file,
      videoId,
    );

    return editorVideo;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export default uploadToApiVideo;
