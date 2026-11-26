import * as admin from 'firebase-admin';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { TMP_PATH_FIXED } from 'src/enums/tmpPathsEnums';
import { fixVideoWithFFMPEG } from './fixVideoWithFFMPEG';

/**
 * @internal
 */
export async function fixVideoAndUploadToBucket(
  blob: Express.Multer.File,
  fullFilename: string,
  uid: string,
  refName?: string,
) {
  try {
    const inputPath = blob.path;
    const fixedVideoPath = join(TMP_PATH_FIXED, fullFilename);
    await fixVideoWithFFMPEG(inputPath, fixedVideoPath);

    const fileRef = await uploadVideoToBucket({
      uid,
      fullFilepath: fixedVideoPath,
      fullFilename,
      itemTypePath: 'videos',
      refName,
    });

    return fileRef;
  } catch (error: any) {
    console.error(error);
  }
}

interface IUploadToBucketParams {
  uid?: string;
  workspaceId?: string;
  fullFilepath: string;
  fullFilename: string;
  itemTypePath: string; // todo replace with item type enum videos/screenshots
  refName?: string;
}

/**
 * @internal
 */
export async function uploadVideoToBucket({
  uid,
  workspaceId,
  fullFilepath,
  fullFilename,
  itemTypePath, // videos | videoPosters
  refName, // to "replace" bucket item with new (ex. trimming)
}: IUploadToBucketParams) {
  try {
    const bucket = admin.storage().bucket();

    let bucketFilename = fullFilename;
    if (refName) {
      bucketFilename = refName;
    }

    let rootPath: string;
    if (workspaceId) {
      rootPath = `workspaces/${workspaceId}`;
    } else {
      rootPath = `users/${uid}`;
    }

    const bucketRef = bucket.file(
      `${rootPath}/${itemTypePath}/${bucketFilename}`,
    );

    // Streamed from the API disk, never read into memory whole: a few large uploads at once would
    // hold gigabytes in the API, and a file over 2 GiB could not be read at all. No options, as the
    // in-memory save had none, so the bucket file gets the content type read from its name. The
    // pipeline settles once the upload is complete or failed (a file that cannot be read fails it
    // and ends the bucket write), before the temporary file is removed below.
    await pipeline(
      createReadStream(fullFilepath),
      bucketRef.createWriteStream(),
    );

    return bucketRef;
  } catch (err) {
    console.error(err);
  } finally {
    // The temporary file goes whether or not the bucket was written, so a failed upload does not
    // stay on the API disk for good. A file that cannot be removed must not hide a write: the
    // caller still gets the file it wrote (an upload that replaced a newer cut must be told).
    await fs.unlink(fullFilepath).catch((err) => console.error(err));
  }
}
