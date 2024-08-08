import ApiVideoClient = require('@api.video/nodejs-client');
import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PlaybackStatusEnum as PSEnum,
  VideoServicesEnum,
} from '../../../enums/StreamingServicesEnums';
import VideoCreationPayload from '@api.video/nodejs-client/lib/model/VideoCreationPayload';
import { IStreamingDbData } from 'src/interfaces/IEditorVideo';

@Injectable()
export class ApiVideoService {
  private readonly ApiVideo: ApiVideoClient;

  constructor(private readonly configService: ConfigService) {
    const APIVIDEO_TOKEN_ID =
      this.configService.get<string>('APIVIDEO_TOKEN_ID');
    const APIVIDEO_BASE_URI =
      this.configService.get<string>('APIVIDEO_BASE_URI');
    const client = new ApiVideoClient({
      apiKey: APIVIDEO_TOKEN_ID,
      baseUri: APIVIDEO_BASE_URI,
    });

    this.ApiVideo = client;
  }

  async getDirectUpload(): Promise<{
    id: string;
    url: string;
    token: string;
  }> {
    try {
      const { videoId } = await this.createVideo();
      const { token } = await this.getUploadToken();

      return { id: videoId, token, url: '' };
    } catch (error) {
      console.log(error);
    }
  }

  async createVideo(): Promise<{ videoId: string }> {
    const config: VideoCreationPayload = {
      title: 'Rec', //? it's good to have different titles here, yet the client doesn't care for now
    };

    const result = await this.ApiVideo.videos.create(config);

    return { videoId: result.videoId };
  }

  async getUploadToken(): Promise<{ token: string }> {
    try {
      const tokenCreationPayload = {
        ttl: 60, // Time in seconds that the token will be active. A value of 0 means that the token has no exipration date. The default is to have no expiration.
      };

      const result = await this.ApiVideo.uploadTokens.createToken(
        tokenCreationPayload,
      );

      return { token: result.token };
    } catch (e) {
      console.error(e);
    }
  }

  async getPlaybackStatus(
    uid: string,
    videoId: string,
    assetId: string,
    workspaceId: string,
  ): Promise<{ data: PSEnum }> {
    try {
      const db = admin.database();
      const rootDb = workspaceId ? 'workspaces' : 'users';
      const parentCollection = workspaceId ? workspaceId : uid;
      const dbStreamData = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}/streamData`,
      );

      const videoStatus = await this.ApiVideo.videos.getStatus(assetId);

      const encodedHLS = videoStatus.encoding.qualities
        .filter((quality) => quality.type === 'hls')
        .some((quality) => quality.status === 'encoded');

      const status = videoStatus.ingest.status as
        | 'uploaded'
        | 'missing'
        | 'ingested';

      if (encodedHLS && (status === 'uploaded' || status === 'ingested')) {
        await dbStreamData.update({
          playbackStatus: PSEnum.READY,
        });

        return { data: PSEnum.READY };
      } else if (status === 'missing') {
        await dbStreamData.update({
          playbackStatus: PSEnum.ERRORED,
        });

        return { data: PSEnum.ERRORED };
      } else {
        return { data: PSEnum.PREPARING };
      }
    } catch (error) {
      console.error(error);
      return { data: PSEnum.ERRORED };
    }
  }

  async getDownloadStatus(
    uid: string,
    videoId: string,
    assetId: string,
  ): Promise<{ downloadStatus: PSEnum; downloadUrl: string }> {
    try {
      const db = admin.database();
      const streamDataRef = db.ref(`users/${uid}/videos/${videoId}/streamData`);
      const streamDataVal: IStreamingDbData = (await streamDataRef.get()).val();
      const downloadStatus = streamDataVal.downloadStatus;
      const downloadUrl = streamDataVal.downloadUrl;

      // Master file is ready in firebase bucket
      if (downloadStatus === PSEnum.READY) {
        return { downloadStatus: PSEnum.READY, downloadUrl };
      }

      // Give us MP4 Rendition from Api.Video
      const videoStatus = await this.ApiVideo.videos.getStatus(assetId);
      const mp4Video = videoStatus.encoding.qualities.find(
        (quality) => quality.type === 'mp4',
      );

      if (
        mp4Video?.status === 'encoded' &&
        videoStatus.ingest.status === 'uploaded'
      ) {
        await streamDataRef.update({
          downloadStatus: PSEnum.READY,
        });

        return { downloadStatus: PSEnum.READY, downloadUrl };
      } else if (
        mp4Video?.status === 'failed' ||
        videoStatus.ingest.status === 'missing'
      ) {
        await streamDataRef.update({
          downloadStatus: PSEnum.ERRORED,
        });

        return { downloadStatus: PSEnum.ERRORED, downloadUrl };
      } else {
        return { downloadStatus: PSEnum.PREPARING, downloadUrl };
      }
    } catch (error) {
      console.error(error);
      return { downloadStatus: PSEnum.ERRORED, downloadUrl: '' };
    }
  }

  async deleteAsset(assetId: string) {
    return this.ApiVideo.videos.delete(assetId);
  }

  async copyAsset(assetId: string) {
    try {
      // Create a video using an existing source
      const response = await this.ApiVideo.videos.create({
        title: 'Rec',
        source: assetId,
      });

      const playbackUrl = response.assets.hls;
      const thumbnailUrl = response.assets.thumbnail;

      const newAsset: IStreamingDbData = {
        assetId: response.videoId,
        serviceType: VideoServicesEnum.API_VIDEO,
        thumbnailUrl,
        playbackUrl,
        playbackStatus: PSEnum.PREPARING,
        downloadStatus: PSEnum.PREPARING,
        downloadUrl: '',
      };

      return newAsset;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
