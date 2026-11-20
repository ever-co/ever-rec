import * as fs from 'fs/promises';
import Ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { basename, dirname, extname, join, resolve } from 'path';
import { TMP_PATH, TMP_PATH_FIXED } from '../../enums/tmpPathsEnums';
Ffmpeg.setFfmpegPath(ffmpegPath);
Ffmpeg.setFfprobePath(ffprobePath.path);

export interface FixVideoResult {
  outputPath: string;
  duration?: string;
}

/**
 * Fix a video container/metadata using ffmpeg.
 * Detects codec and switches to `.webm` if VP8 is found.
 *
 * The input is removed however this ends, and a failed conversion also removes its partial
 * output: a corrupt or non-video upload must not stay on the API disk for good.
 */
export async function fixVideoWithFFMPEG(
  brokenVideoPath: string,
  fixedVideoPath: string,
): Promise<FixVideoResult> {
  let outputPath = fixedVideoPath;
  // Set while ffmpeg may have written part of the output.
  let partialOutputPath: string | undefined;

  try {
    // Step 1: Inspect video metadata
    const metadata = await new Promise<Ffmpeg.FfprobeData>(
      (resolve, reject) => {
        Ffmpeg(brokenVideoPath).ffprobe((err, meta) => {
          if (err) reject(err);
          else resolve(meta);
        });
      },
    );

    // Step 2: Decide output format
    const usesVp8 = metadata.streams.some((s) => s.codec_name === 'vp8');

    if (usesVp8) {
      const base = basename(fixedVideoPath, extname(fixedVideoPath));
      outputPath = join(dirname(fixedVideoPath), `${base}.webm`);
    }

    // Step 3: Process video
    partialOutputPath = outputPath;
    const duration = await new Promise<string | undefined>(
      (resolve, reject) => {
        let detectedDuration: string | undefined;

        Ffmpeg(brokenVideoPath)
          .videoCodec('copy') // no re-encode
          .output(outputPath)
          .on('codecData', (codecData) => {
            if (codecData.duration && codecData.duration !== 'N/A') {
              detectedDuration = codecData.duration; // full format (HH:MM:SS.xx)
            }
          })
          .on('end', () => resolve(detectedDuration))
          .on('error', (err) => reject(err))
          .on('progress', (progress) => {
            console.debug(`Processing: ${progress.percent?.toFixed(2)}%`);
          })
          .run();
      },
    );
    partialOutputPath = undefined;

    return { outputPath, duration };
  } finally {
    // Step 4: Clean up original video (best effort), and the partial output of a failed run
    await removeTmpFile(brokenVideoPath, TMP_PATH, 'original');
    if (partialOutputPath) {
      await removeTmpFile(partialOutputPath, TMP_PATH_FIXED, 'partial');
    }
  }
}

/** Best effort: never throws, and never removes a file outside `tmpDir`. */
async function removeTmpFile(path: string, tmpDir: string, label: string) {
  try {
    const resolvedPath = resolve(path);
    if (resolvedPath.startsWith(resolve(tmpDir))) {
      await fs
        .unlink(resolvedPath)
        .catch((err) =>
          console.warn(`Failed to delete ${label} file: ${err.message}`),
        );
    } else {
      console.warn(
        `Attempted to delete file outside ${tmpDir}: ${resolvedPath}`,
      );
    }
  } catch (err) {
    console.warn(`Error during path validation for deletion: ${err.message}`);
  }
}
