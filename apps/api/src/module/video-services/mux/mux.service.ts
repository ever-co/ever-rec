/* eslint-disable @typescript-eslint/no-var-requires */
// tslint:disable-next-line: no-var-requires
const Mux = require('@mux/mux-node');
import * as admin from 'firebase-admin';
import { Asset } from '@mux/mux-node/dist/video/domain';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PlaybackStatusEnum as PSEnum,
  VideoServicesEnum,
} from '../../../enums/StreamingServicesEnums';
import { IStreamingDbData } from 'src/interfaces/IEditorVideo';

// https://muxinc.github.io/mux-node-sdk/identifiers.html - Check the reference for mux-node, there is no TypeScript version of the library
// Alongside https://docs.mux.com/api-reference/video#operation/list-assets

const createPlaybackUrl = (playbackId: string) => {
  return `https://stream.mux.com/${playbackId}.m3u8`;
};

const createThumbnailUrl = (playbackId: string) => {
  return `https://image.mux.com/${playbackId}/thumbnail.png`;
};

@Injectable()
export class MuxService {
  private readonly Video: any;

  constructor(private readonly configService: ConfigService) {
    const MUX_TOKEN_ID = this.configService.get<string>('MUX_TOKEN_ID');
    const MUX_TOKEN_SECRET = this.configService.get<string>('MUX_TOKEN_SECRET');
    const { Video: VideoMux } = new Mux(MUX_TOKEN_ID, MUX_TOKEN_SECRET);

    this.Video = VideoMux;
  }

  async getDirectUpload(): Promise<{ url: string; id: string }> {
    try {
      const upload = await this.Video.Uploads.create({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: 'public',
          mp4_support: 'standard',
        },
      });

      return { url: upload.url, id: upload.id };
    } catch (error) {
      console.log(error);
    }
  }

  async getUploadedAsset(uploadId: string): Promise<{ asset: Asset }> {
    try {
      const upload = await this.Video.Uploads.get(uploadId);
      const asset = await this.Video.Assets.get(upload.asset_id);

      return { asset };
    } catch (error) {
      console.log(error);
    }
  }

  // Pollable
  async getPlaybackStatus(
    uid: string,
    videoId: string,
    assetId: string,
    workspaceId: string
  ): Promise<{ data: PSEnum }> {
    try {
      const db = admin.database();
      const rootDb = workspaceId ? 'workspaces' : 'users';
      const parentCollection = workspaceId ? workspaceId : uid;
      const dbStreamData = db.ref(
        `${rootDb}/${parentCollection}/videos/${videoId}/streamData`
      );

      const asset = await this.Video.Assets.get(assetId);

      if (asset.status === 'ready') {
        await dbStreamData.update({
          playbackStatus: PSEnum.READY,
        });

        return { data: PSEnum.READY };
      } else if (asset.status === 'errored') {
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

  // Pollable
  async getDownloadStatus(
    uid: string,
    videoId: string,
    assetId: string
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

      // Give us MP4 rendition from Mux
      const asset = await this.Video.Assets.get(assetId);
      if (asset && asset?.static_renditions?.status === 'ready') {
        await streamDataRef.update({
          downloadStatus: PSEnum.READY,
          downloadUrl,
        });

        return { downloadStatus: PSEnum.READY, downloadUrl };
      } else if (asset?.static_renditions?.status === 'errored') {
        await streamDataRef.update({
          data: PSEnum.ERRORED,
        });

        return { downloadStatus: PSEnum.ERRORED, downloadUrl };
      }

      return { downloadStatus: PSEnum.PREPARING, downloadUrl };
    } catch (error) {
      console.error(error);
      return { downloadStatus: PSEnum.ERRORED, downloadUrl: '' };
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    return this.Video.Assets.del(assetId);
  }

  async copyAsset(assetId: string): Promise<IStreamingDbData | null> {
    try {
      const asset = await this.Video.Assets.create({
        input: `mux://assets/${assetId}`,
        playback_policy: ['public'],
      });

      const playbackId = asset.playback_ids[0].id;
      const playbackUrl = createPlaybackUrl(playbackId);
      const thumbnailUrl = createThumbnailUrl(playbackId);

      const newAsset: IStreamingDbData = {
        assetId: asset.id,
        serviceType: VideoServicesEnum.MUX,
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
