import { VideoServicesEnum } from '@/app/enums/StreamingServicesEnums';
import uploadToMux from './services/uploadToMux';
import uploadToApiVideo from './services/uploadToApiVideo';
// import uploadToCloudinary from './services/uploadToCloudinary';
// import uploadToLocalStorage from './services/uploadToLocalStorage';

export const uploadVideoToService = async (
  blob: Blob,
  videoTitle = 'Rec',
  service: VideoServicesEnum,
  videoDuration: string,
  videoId?: string | undefined,
) => {
  const createdFile = new File([blob], 'Rec', {
    type: blob.type,
  });

  switch (service) {
    case VideoServicesEnum.MUX:
      return uploadToMux(createdFile, videoTitle, videoDuration, videoId);
    case VideoServicesEnum.API_VIDEO:
      return uploadToApiVideo(createdFile, videoTitle, videoDuration, videoId);
    // case VideoServices.CLOUDINARY:
    //     uploadToCloudinary(createdFile, roomId, createdTaskId);
    //     break;
    // case VideoServices.LOCAL_STORAGE:
    //     uploadToLocalStorage(createdFile, roomId, createdTaskId);
    //     break;
    default:
      console.error(`Service ${service} is not implemented.`);
      return null;
  }
};
