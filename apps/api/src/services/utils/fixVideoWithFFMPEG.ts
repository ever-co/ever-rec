import * as fs from 'fs/promises';
import Ffmpeg from 'fluent-ffmpeg'; // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#readme

// Create a new mp4 video with correct metadata with Ffmpeg:

// First create a command and test it a few times
// example: ffmpeg -i test.webm -vcodec vp9 -cpu-used -5 -deadline realtime out.webm
const fixVideoWithFFMPEG = async (
  brokenVideoPath: string,
  fixedVideoPath: string,
) => {

  let outputPath = fixedVideoPath;
  const command = Ffmpeg(); // Package fluent-ffmpeg
  let duration = null;

  // Some browsers (Firefox) don't work with h264 codec and have used vp8, lets just save it as .webm file and upload it
  const data: any = await new Promise((resolve, reject) => {
    command.input(brokenVideoPath).ffprobe(function (err, metadata) {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });

  data.streams.forEach((stream) => {
    if (stream.codec_name === 'vp8') {
      outputPath = fixedVideoPath.replace('mp4', 'webm');
    }
  });

  const outputVideo = await new Promise((resolve, reject) => {
    command
      .input(brokenVideoPath)
      .videoCodec('copy')
      .output(outputPath)

      .on('end', async (event) => {
        console.log(event);
        resolve(null);
      })

      .on('error', async (error) => {
        console.log(error);
        reject(error);
      })

      .on('progress', async (progress) => {
        console.log('Processing: ' + progress.percent + '% done');
      })

      .on('codecData', async (codecData) => {
        // ex. '00:01:30.52'
        if (codecData.duration !== 'N/A') {
          const durationArray = codecData.duration.split(':');
          const minutes = durationArray[1];
          const seconds = durationArray[2].split('.')[0];
          duration = minutes + ':' + seconds;
        }
      })

      .run();
  });

  // Remove initial video - don't await this - we don't care to continue
  fs.unlink(brokenVideoPath).catch((error) => {
    console.log(error);
  });

  return { outputVideo, duration, outputPath };
};

export { fixVideoWithFFMPEG };
