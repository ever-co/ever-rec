import IEditorVideo from '@/app/interfaces/IEditorVideo';
import * as UpChunk from '@mux/upchunk';
import {
  PlaybackStatusEnum,
  VideoServicesEnum,
} from '@/app/enums/StreamingServicesEnums';
import { directUpload, uploadedAsset } from '@/app/services/api/videoStreaming';
import { saveVideoStreamData } from '@/app/services/videosStreaming';
import { sendRuntimeMessage } from '../../scripts/sendRuntimeMessage';
import { AppMessagesEnum } from '@/app/messagess';

const createPlaybackUrl = (playbackId: string) => {
  return `https://stream.mux.com/${playbackId}.m3u8`;
};

const createThumbnailUrl = (playbackId: string) => {
  return `https://image.mux.com/${playbackId}/thumbnail.png`;
};

const createDownloadUrl = (playbackId: string) => {
  return `https://stream.mux.com/${playbackId}/high.mp4`;
};

const uploadToMux = async (
  file: File,
  videoTitle: string,
  videoDuration: string,
  videoId?: string,
): Promise<IEditorVideo | null> => {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const upload = await directUpload(VideoServicesEnum.MUX);
        const uploadId = upload.id;
        const uploadURL = upload.url;

        const upChunk = UpChunk.createUpload({
          endpoint: uploadURL,
          maxFileSize: 2 ** 20, // 1GB
          file,
        });

        upChunk.on('success', async () => {
          const { asset } = await uploadedAsset(
            uploadId,
            VideoServicesEnum.MUX,
          );

          const playbackId = asset.playback_ids[0].id;
          const playbackUrl = createPlaybackUrl(playbackId);
          const thumbnailUrl = createThumbnailUrl(playbackId);
          const downloadUrl = createDownloadUrl(playbackId);

          const editorVideo = await saveVideoStreamData(
            {
              videoTitle,
              videoDuration,
              serviceType: VideoServicesEnum.MUX,
              assetId: asset.id,
              thumbnailUrl,
              playbackUrl,
              playbackStatus: PlaybackStatusEnum.PREPARING,
              downloadStatus: PlaybackStatusEnum.PREPARING,
              downloadUrl,
            },
            file, // To save to firebase bucket
            videoId,
          );

          resolve(editorVideo);
        });

        upChunk.on('progress', async (progress) => {
          const percentage = progress.detail.toFixed();
          sendRuntimeMessage({
            action: AppMessagesEnum.streamServiceUploadProgressSW,
            payload: { percentage },
          });
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    })();
  });
};

export default uploadToMux;
