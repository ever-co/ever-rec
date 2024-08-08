import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import { DbVideoData, IStreamingDbData } from '../../interfaces/IEditorVideo';
import {
  PlaybackStatusEnum as PSEnum,
  VideoServicesEnum,
} from '../../enums/StreamingServicesEnums';
import { ApiVideoService } from './api-video/api-video.service';
import { MuxService } from './mux/mux.service';
import { fixVideoAndUploadToBucket } from 'src/services/utils/uploadVideoToBucket';
import { formatDataToArray } from 'src/services/utils/helpers';

@Injectable()
export class StreamServiceService {
  private readonly config;

  constructor(
    private readonly muxService: MuxService,
    private readonly apiVideoService: ApiVideoService,
  ) {
    this.config = {
      action: 'read',
      expires: '03-01-2500',
    };
  }

  async saveVideoData(
    uid: string,
    data: IStreamingDbData,
    blob: Express.Multer.File,
    fullFilename: string,
  ) {
    try {
      const db = admin.database();
      const videoRef = db.ref(`users/${uid}/videos`);
      const newVideoRef = videoRef.push();
      const id = newVideoRef.key;

      const newVideo: any = {
        title: data.videoTitle,
        duration: data.videoDuration,
        created: new Date(),
        parentId: false,
        likes: 0,
        streamData: {
          serviceType: data.serviceType,
          assetId: data.assetId,
          thumbnailUrl: data.thumbnailUrl,
          playbackUrl: data.playbackUrl,
          playbackStatus: PSEnum.PREPARING,
          downloadStatus: PSEnum.PREPARING,
          downloadUrl: data.downloadUrl,
        },
        uid,
        refName: fullFilename,
        id,
      };

      await newVideoRef.set(JSON.parse(JSON.stringify(newVideo)));

      // Dont await this, we have polling on the client for downloadStatus and downloadUrl
      fixVideoAndUploadToBucket(blob, fullFilename, uid)
        .then(async (fileRef) => {
          const downloadUrl = (await fileRef.getSignedUrl(this.config))[0];
          const streamDataRef = db.ref(`users/${uid}/videos/${id}/streamData`);
          await streamDataRef.update({
            downloadStatus: PSEnum.READY,
            downloadUrl,
          });
        })
        .catch((error) => console.error(error));

      return { dbData: newVideo, url: data.playbackUrl };
    } catch (error) {
      console.log(error);
    }
  }

  async updateVideoData(
    uid: string,
    data: IStreamingDbData,
    videoId: string,
    blob: Express.Multer.File,
    fullFilename: string,
  ) {
    try {
      const db = admin.database();
      const videoRef = db.ref(`users/${uid}/videos/${videoId}`);
      const videoData = (await videoRef.get()).val();

      if (!videoData) {
        throw new Error(
          `There is no video streamData: users/${uid}/videos/${videoId}`,
        );
      }

      await videoRef.update({
        duration: data.videoDuration,
        streamData: {
          serviceType: data.serviceType,
          assetId: data.assetId,
          thumbnailUrl: data.thumbnailUrl,
          playbackUrl: data.playbackUrl,
          playbackStatus: PSEnum.PREPARING,
          downloadStatus: PSEnum.PREPARING,
          downloadUrl: data.downloadUrl,
        },
      });

      const refName = videoData?.refName;
      if (refName) {
        fixVideoAndUploadToBucket(blob, fullFilename, uid, refName)
          .then(async (fileRef) => {
            const downloadUrl = (await fileRef.getSignedUrl(this.config))[0];
            const streamDataRef = db.ref(
              `users/${uid}/videos/${videoId}/streamData`,
            );
            await streamDataRef.update({
              downloadStatus: PSEnum.READY,
              downloadUrl,
            });
          })
          .catch((error) => console.error(error));
      }

      await this.deleteAsset(
        videoData.streamData.assetId,
        videoData.streamData.serviceType,
      );

      const dbData: DbVideoData = (await videoRef.get()).val();
      const allViews = formatDataToArray(dbData.views);
      dbData.views = allViews.length;

      return { dbData, url: data.playbackUrl };
    } catch (error) {
      console.log(error);
    }
  }

  async deleteAsset(assetId: string, serviceType: VideoServicesEnum) {
    switch (serviceType) {
      case VideoServicesEnum.MUX:
        return this.muxService.deleteAsset(assetId);
      case VideoServicesEnum.API_VIDEO:
        return this.apiVideoService.deleteAsset(assetId);
      default:
        return null;
    }
  }

  async copyAsset(
    assetId: string,
    serviceType: VideoServicesEnum,
  ): Promise<IStreamingDbData | null> {
    switch (serviceType) {
      case VideoServicesEnum.MUX:
        return this.muxService.copyAsset(assetId);
      case VideoServicesEnum.API_VIDEO:
        return this.apiVideoService.copyAsset(assetId);
      default:
        return null;
    }
  }
}
