/**
 * The upload in `tmp_videos` was removed only after ffprobe and ffmpeg both succeeded, so every
 * corrupt recording (or a file that is no video at all) stayed on the API disk for good, next to
 * the partial output ffmpeg had started in `tmp_videos_fixed`. Now the upload is removed however
 * the conversion ends, and a failed conversion also removes its partial output.
 */
import { join, resolve } from 'path';
import { TMP_PATH, TMP_PATH_FIXED } from '../../enums/tmpPathsEnums';
import { fixVideoWithFFMPEG } from './fixVideoWithFFMPEG';

type Callback = (...args: any[]) => void;

const mockFfmpeg: {
  probe: { error?: Error; streams: { codec_name: string }[] };
  run: { error?: Error; duration?: string };
  outputs: string[];
} = { probe: { streams: [] }, run: {}, outputs: [] };

jest.mock('fluent-ffmpeg', () => {
  const ffmpeg: any = () => {
    const handlers: Record<string, Callback> = {};
    const command = {
      ffprobe: (callback: Callback) => {
        if (mockFfmpeg.probe.error) callback(mockFfmpeg.probe.error);
        else callback(null, { streams: mockFfmpeg.probe.streams });
      },
      videoCodec: () => command,
      output: (path: string) => {
        mockFfmpeg.outputs.push(path);
        return command;
      },
      on: (event: string, handler: Callback) => {
        handlers[event] = handler;
        return command;
      },
      run: () => {
        if (mockFfmpeg.run.error) {
          handlers.error(mockFfmpeg.run.error);
          return;
        }
        handlers.codecData({ duration: mockFfmpeg.run.duration ?? 'N/A' });
        handlers.end();
      },
    };
    return command;
  };
  ffmpeg.setFfmpegPath = () => undefined;
  ffmpeg.setFfprobePath = () => undefined;
  return ffmpeg;
});
jest.mock('ffmpeg-static', () => '/bin/ffmpeg');
jest.mock('ffprobe-static', () => ({ path: '/bin/ffprobe' }));

const mockUnlink = jest.fn<Promise<void>, [string]>();
jest.mock('fs/promises', () => ({
  unlink: (path: string) => mockUnlink(path),
}));

describe('fixVideoWithFFMPEG', () => {
  const upload = join(TMP_PATH, 'upload-1');
  const fixed = join(TMP_PATH_FIXED, 'upload-1.mp4');

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    mockFfmpeg.probe = { streams: [{ codec_name: 'h264' }] };
    mockFfmpeg.run = { duration: '00:00:05.00' };
    mockFfmpeg.outputs = [];
    mockUnlink.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes the upload and keeps the fixed video when the conversion succeeds', async () => {
    await expect(fixVideoWithFFMPEG(upload, fixed)).resolves.toEqual({
      outputPath: fixed,
      duration: '00:00:05.00',
    });

    expect(mockUnlink.mock.calls).toEqual([[resolve(upload)]]);
  });

  it('removes the upload when ffprobe cannot read it', async () => {
    mockFfmpeg.probe = { error: new Error('Invalid data'), streams: [] };

    await expect(fixVideoWithFFMPEG(upload, fixed)).rejects.toThrow(
      'Invalid data',
    );

    expect(mockFfmpeg.outputs).toEqual([]);
    expect(mockUnlink.mock.calls).toEqual([[resolve(upload)]]);
  });

  it('removes the upload and the partial output when ffmpeg fails', async () => {
    mockFfmpeg.probe = { streams: [{ codec_name: 'vp8' }] };
    mockFfmpeg.run = { error: new Error('ffmpeg exited with code 1') };

    await expect(fixVideoWithFFMPEG(upload, fixed)).rejects.toThrow(
      'ffmpeg exited with code 1',
    );

    const partial = join(TMP_PATH_FIXED, 'upload-1.webm');
    expect(mockFfmpeg.outputs).toEqual([partial]);
    expect(mockUnlink.mock.calls).toEqual(
      expect.arrayContaining([[resolve(upload)], [resolve(partial)]]),
    );
    expect(mockUnlink).toHaveBeenCalledTimes(2);
  });

  it('keeps the error of the conversion when a file cannot be removed', async () => {
    mockFfmpeg.run = { error: new Error('ffmpeg exited with code 1') };
    mockUnlink.mockRejectedValue(new Error('EBUSY'));

    await expect(fixVideoWithFFMPEG(upload, fixed)).rejects.toThrow(
      'ffmpeg exited with code 1',
    );
    expect(mockUnlink).toHaveBeenCalledTimes(2);
  });

  it('never removes a file outside the temporary upload folders', async () => {
    mockFfmpeg.run = { error: new Error('ffmpeg exited with code 1') };

    await expect(
      fixVideoWithFFMPEG('/srv/videos/keep.mp4', '/srv/videos/keep-fixed.mp4'),
    ).rejects.toThrow('ffmpeg exited with code 1');

    expect(mockUnlink).not.toHaveBeenCalled();
  });
});
