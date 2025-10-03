import * as fs from 'fs/promises';
import Ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import { basename, dirname, extname, join, resolve } from 'path';
import { TMP_PATH } from '../../enums/tmpPathsEnums';
Ffmpeg.setFfmpegPath(ffmpegPath);
Ffmpeg.setFfprobePath(ffprobePath.path);

export interface FixVideoResult {
  outputPath: string;
  duration?: string;
}

/**
 * Fix a video container/metadata using ffmpeg.
 * Detects codec and switches to `.webm` if VP8 is found.
 */
export async function fixVideoWithFFMPEG(
  brokenVideoPath: string,
  fixedVideoPath: string,
): Promise<FixVideoResult> {
  // Step 1: Inspect video metadata
  const metadata = await new Promise<Ffmpeg.FfprobeData>((resolve, reject) => {
    Ffmpeg(brokenVideoPath).ffprobe((err, meta) => {
      if (err) reject(err);
      else resolve(meta);
    });
  });

  // Step 2: Decide output format
  let outputPath = fixedVideoPath;
  const usesVp8 = metadata.streams.some((s) => s.codec_name === 'vp8');

  if (usesVp8) {
    const base = basename(fixedVideoPath, extname(fixedVideoPath));
    outputPath = join(dirname(fixedVideoPath), `${base}.webm`);
  }

  // Step 3: Process video
  const duration = await new Promise<string | undefined>((resolve, reject) => {
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
  });

  // Step 4: Clean up original video (best effort)
  try {
    const resolvedPath = resolve(brokenVideoPath);
    if (resolvedPath.startsWith(resolve(TMP_PATH))) {
      fs.unlink(resolvedPath).catch((err) =>
        console.warn(`Failed to delete original file: ${err.message}`),
      );
    } else {
      console.warn(`Attempted to delete file outside TMP_PATH: ${resolvedPath}`);
    }
  } catch (err) {
    console.warn(`Error during path validation for deletion: ${err.message}`);
  }

  return { outputPath, duration };
}
