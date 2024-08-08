import { PlaybackStatusEnum } from 'app/enums/StreamingServicesEnums';
import { VideoServicesEnum } from 'app/enums/StreamingServicesEnums';

export interface IStreamState {
  service: VideoServicesEnum;
  assetId: string;
  playbackStatus: PlaybackStatusEnum;
  downloadStatus: PlaybackStatusEnum;
  downloadUrl: string;
}
