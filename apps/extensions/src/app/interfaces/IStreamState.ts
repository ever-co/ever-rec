import {
  PlaybackStatusEnum,
  VideoServicesEnum,
} from '../enums/StreamingServicesEnums';

export interface IStreamState {
  service: VideoServicesEnum;
  assetId: string;
  playbackStatus: PlaybackStatusEnum;
  downloadStatus: PlaybackStatusEnum;
  downloadUrl: string;
}
