import * as admin from 'firebase-admin';
import { unlink } from 'fs/promises';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { is_id } from '../workspace/validators/id.validator';
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

  /**
   * Refuses (400) a service type we cannot look an asset up in or an assetId that is not a plain
   * id, and (403) an asset that was not created for `uid`. The asset ids of shared videos are
   * public, and this service deletes the previously stored asset with its own provider
   * credentials, so an unchecked assetId would let one user delete another user's stream.
   */
  async assertAssetOwnedBy(
    uid: string,
    assetId: string,
    serviceType: VideoServicesEnum,
  ): Promise<void> {
    if (
      serviceType !== VideoServicesEnum.MUX &&
      serviceType !== VideoServicesEnum.API_VIDEO
    ) {
      throw new BadRequestException('Unsupported serviceType');
    }

    if (typeof assetId !== 'string' || !is_id(assetId)) {
      throw new BadRequestException('Invalid assetId');
    }

    let owner: string | null = null;
    try {
      owner =
        serviceType === VideoServicesEnum.MUX
          ? await this.muxService.getAssetOwner(assetId)
          : await this.apiVideoService.getAssetOwner(assetId);
    } catch (error) {
      // An asset the provider does not know, or cannot be asked about, is not proven to be theirs.
      console.error(error);
    }

    if (!uid || !owner || owner !== uid) {
      throw new ForbiddenException('This asset does not belong to you');
    }
  }

  /** Removes the temporary file of a refused upload, then rethrows the reason it was refused. */
  private async discardUpload(
    blob: Express.Multer.File,
    reason: unknown,
  ): Promise<never> {
    if (blob?.path) {
      await unlink(blob.path).catch(() => undefined);
    }
    throw reason;
  }

  async saveVideoData(
    uid: string,
    data: IStreamingDbData,
    blob: Express.Multer.File,
    fullFilename: string,
  ) {
    // Outside the try/catch below, which would swallow it into a 201 with no body.
    await this.assertAssetOwnedBy(uid, data?.assetId, data?.serviceType).catch(
      (error) => this.discardUpload(blob, error),
    );

    try {
      const db = admin.database();
      const videoRef = db.ref(`users/${uid}/videos`);
      const newVideoRef = videoRef.push();
      const id = newVideoRef.key;
      // Never data.downloadUrl: the Jira and Trello export used to fetch the stored link from the
      // server, so a client-sent URL let a caller read internal addresses.
      const downloadUrl = await this.getDownloadUrl(
        data.assetId,
        data.serviceType,
      );

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
          downloadUrl,
        },
        uid,
        refName: fullFilename,
        id,
      };

      await newVideoRef.set(JSON.parse(JSON.stringify(newVideo)));

      // Dont await this, we have polling on the client for downloadStatus and downloadUrl.
      // A trim right after the recording can replace the asset before this upload is done.
      const uploadedAssetId = data.assetId;
      fixVideoAndUploadToBucket(blob, fullFilename, uid)
        .then((fileRef) =>
          this.markMasterUploaded(fileRef, uid, id, uploadedAssetId),
        )
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
    // Outside the try/catch below, which would swallow it into a 201 with no body.
    if (typeof videoId !== 'string' || !is_id(videoId)) {
      return this.discardUpload(
        blob,
        new BadRequestException('Invalid videoId'),
      );
    }
    await this.assertAssetOwnedBy(uid, data?.assetId, data?.serviceType).catch(
      (error) => this.discardUpload(blob, error),
    );

    try {
      const db = admin.database();
      const videoRef = db.ref(`users/${uid}/videos/${videoId}`);
      const videoData = (await videoRef.get()).val();

      if (!videoData) {
        throw new Error(
          `There is no video streamData: users/${uid}/videos/${videoId}`,
        );
      }

      // Never data.downloadUrl, see saveVideoData.
      const downloadUrl = await this.getDownloadUrl(
        data.assetId,
        data.serviceType,
      );

      await videoRef.update({
        duration: data.videoDuration,
        streamData: {
          serviceType: data.serviceType,
          assetId: data.assetId,
          thumbnailUrl: data.thumbnailUrl,
          playbackUrl: data.playbackUrl,
          playbackStatus: PSEnum.PREPARING,
          downloadStatus: PSEnum.PREPARING,
          downloadUrl,
          // The master file in the bucket is still the previous cut (such as the untrimmed
          // video) until the upload below is done, and for good if it fails.
          masterStale: true,
        },
      });

      const refName = videoData?.refName;
      if (refName) {
        const uploadedAssetId = data.assetId;
        fixVideoAndUploadToBucket(blob, fullFilename, uid, refName)
          .then((fileRef) =>
            this.markMasterUploaded(fileRef, uid, videoId, uploadedAssetId),
          )
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

  /**
   * Records that the master file of `uploadedAssetId` was written to the bucket, at
   * users/<uid>/videos/<refName>. The first upload of a recording and the upload after each trim or
   * reset write that same file, in the background.
   * - A failed upload (no file) changes nothing: a replaced asset keeps its `masterStale` mark.
   * - If the record still has that asset, the master is its cut: ready, with the bucket link.
   * - If the asset was replaced meanwhile, the bucket now holds this older cut: the newer asset
   *   keeps its mark (or gets it back) and its own links.
   * - A video deleted meanwhile is not recreated as a partial record.
   * A transaction, so the asset is compared and the record written in one step.
   */
  private async markMasterUploaded(
    fileRef: Awaited<ReturnType<typeof fixVideoAndUploadToBucket>>,
    uid: string,
    videoId: string,
    uploadedAssetId: string,
  ) {
    if (!fileRef) {
      // The upload failed (the uploader logged why).
      return;
    }
    const downloadUrl = (await fileRef.getSignedUrl(this.config))[0];
    const streamDataRef = admin
      .database()
      .ref(`users/${uid}/videos/${videoId}/streamData`);
    await streamDataRef.transaction((current: IStreamingDbData | null) => {
      if (!current) {
        return current;
      }
      if (current.assetId !== uploadedAssetId) {
        return { ...current, masterStale: true };
      }
      return {
        ...current,
        downloadStatus: PSEnum.READY,
        downloadUrl,
        masterStale: false,
      };
    });
  }

  /** The links of an asset as its streaming provider reports them, or null. */
  async getStreamLinks(
    assetId: string,
    serviceType: VideoServicesEnum,
  ): Promise<{ playbackUrl: string; thumbnailUrl: string } | null> {
    switch (serviceType) {
      case VideoServicesEnum.MUX:
        return this.muxService.getStreamLinks(assetId);
      case VideoServicesEnum.API_VIDEO:
        return this.apiVideoService.getStreamLinks(assetId);
      default:
        return null;
    }
  }

  /**
   * The MP4 download link of an asset as its streaming provider reports it, or '' when it is not
   * known. Until the master file is in the bucket, this is the link the video is downloaded from.
   */
  async getDownloadUrl(
    assetId: string,
    serviceType: VideoServicesEnum,
  ): Promise<string> {
    switch (serviceType) {
      case VideoServicesEnum.MUX:
        return (await this.muxService.getDownloadUrl(assetId)) ?? '';
      case VideoServicesEnum.API_VIDEO:
        return (await this.apiVideoService.getDownloadUrl(assetId)) ?? '';
      default:
        return '';
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
