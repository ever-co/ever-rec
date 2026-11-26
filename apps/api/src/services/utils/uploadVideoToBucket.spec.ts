/**
 * The uploader returns the bucket file once it is written, and nothing when it is not. A temporary
 * file it cannot remove afterwards does not hide the write: the trim flow must still learn that an
 * older cut replaced the master file, to mark it stale (streamService markMasterUploaded).
 * The video is streamed to the bucket from its path on the API disk, never read into memory: a few
 * large uploads at once must not run the API out of memory, and a file over 2 GiB must still go up.
 */
import { Readable, Writable } from 'stream';
import { uploadVideoToBucket } from './uploadVideoToBucket';

/** A bucket write stream that keeps what it receives; `fail` makes the bucket refuse the write. */
function bucketSink(fail?: Error) {
  const received: Buffer[] = [];
  let finishUpload: (() => void) | undefined;
  let holdFinish = false;
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      received.push(chunk);
      callback(fail);
    },
    final(callback) {
      // The bucket library ends its stream once the upload is complete, not when the last byte
      // was handed to it.
      if (holdFinish) {
        finishUpload = () => callback();
        return;
      }
      callback();
    },
  });
  return {
    stream,
    received,
    holdFinish: () => {
      holdFinish = true;
    },
    finishUpload: () => finishUpload?.(),
  };
}

let sink: ReturnType<typeof bucketSink>;
const mockSave = jest.fn<Promise<void>, [Buffer]>();
const mockCreateWriteStream = jest.fn(() => sink.stream);
const mockFile = jest.fn((path: string) => ({
  path,
  save: mockSave,
  createWriteStream: mockCreateWriteStream,
}));
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => ({ file: mockFile }) }),
}));

const mockCreateReadStream = jest.fn<Readable, [string]>();
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: (path: string) => mockCreateReadStream(path),
}));

const mockReadFile = jest.fn<Promise<Buffer>, [string]>();
const mockUnlink = jest.fn<Promise<void>, [string]>();
jest.mock('fs/promises', () => ({
  readFile: (path: string) => mockReadFile(path),
  unlink: (path: string) => mockUnlink(path),
}));

jest.mock('./fixVideoWithFFMPEG', () => ({ fixVideoWithFFMPEG: jest.fn() }));

/** The temporary file, read in more than one chunk. */
const videoOnDisk = () =>
  Readable.from([Buffer.from('vid'), Buffer.from('eo')]);

/** A temporary file that cannot be read. */
const unreadable = (error: Error) =>
  new Readable({
    read() {
      this.destroy(error);
    },
  });

describe('uploadVideoToBucket', () => {
  const params = {
    uid: 'uid-me',
    fullFilepath: 'tmp_videos_fixed/rec.webm',
    fullFilename: 'rec.webm',
    itemTypePath: 'videos',
    refName: 'vid1.webm',
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    sink = bucketSink();
    mockSave.mockReset().mockResolvedValue(undefined);
    mockCreateWriteStream.mockClear();
    mockFile.mockClear();
    mockCreateReadStream.mockReset().mockImplementation(videoOnDisk);
    mockReadFile.mockReset().mockResolvedValue(Buffer.from('video'));
    mockUnlink.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('streams the file from its path to the bucket and never reads it into memory', async () => {
    const fileRef = await uploadVideoToBucket(params);

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockCreateReadStream).toHaveBeenCalledWith(
      'tmp_videos_fixed/rec.webm',
    );
    expect(Buffer.concat(sink.received).toString()).toBe('video');
    // No options, as the in-memory save had none: the bucket file keeps the content type the
    // bucket library reads from its name (video/webm here), so the player and downloads work.
    expect(mockCreateWriteStream).toHaveBeenCalledTimes(1);
    expect(mockCreateWriteStream).toHaveBeenCalledWith();
    expect(fileRef).toMatchObject({ path: 'users/uid-me/videos/vid1.webm' });
  });

  it('writes a workspace video under the workspace, named after the file', async () => {
    const fileRef = await uploadVideoToBucket({
      workspaceId: 'ws-1',
      fullFilepath: 'tmp_videos_fixed/rec.webm',
      fullFilename: 'rec.webm',
      itemTypePath: 'videos',
    });

    expect(mockFile).toHaveBeenCalledWith('workspaces/ws-1/videos/rec.webm');
    expect(Buffer.concat(sink.received).toString()).toBe('video');
    expect(fileRef).toMatchObject({ path: 'workspaces/ws-1/videos/rec.webm' });
  });

  it('returns the file it wrote to the bucket and removes the temporary file', async () => {
    const fileRef = await uploadVideoToBucket(params);

    expect(mockFile).toHaveBeenCalledWith('users/uid-me/videos/vid1.webm');
    expect(mockCreateWriteStream).toHaveBeenCalled();
    expect(mockUnlink).toHaveBeenCalledWith('tmp_videos_fixed/rec.webm');
    expect(fileRef).toMatchObject({ path: 'users/uid-me/videos/vid1.webm' });
  });

  // The bucket reads the temporary file while it uploads: it must still be there until the end.
  it('removes the temporary file and returns only once the bucket upload is complete', async () => {
    sink.holdFinish();
    let settled = false;

    const pending = uploadVideoToBucket(params).finally(() => {
      settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(Buffer.concat(sink.received).toString()).toBe('video');
    expect(mockUnlink).not.toHaveBeenCalled();
    expect(settled).toBe(false);

    sink.finishUpload();
    expect(await pending).toMatchObject({
      path: 'users/uid-me/videos/vid1.webm',
    });
    expect(mockUnlink).toHaveBeenCalledWith('tmp_videos_fixed/rec.webm');
  });

  it('still returns the written file when the temporary file cannot be removed', async () => {
    mockUnlink.mockRejectedValueOnce(new Error('EBUSY'));

    const fileRef = await uploadVideoToBucket(params);

    expect(Buffer.concat(sink.received).toString()).toBe('video');
    expect(fileRef).toMatchObject({ path: 'users/uid-me/videos/vid1.webm' });
    expect(console.error).toHaveBeenCalled();
  });

  it('returns nothing when the bucket was not written', async () => {
    sink = bucketSink(new Error('bucket unavailable'));
    expect(await uploadVideoToBucket(params)).toBeUndefined();

    sink = bucketSink();
    mockCreateReadStream.mockImplementationOnce(() =>
      unreadable(new Error('ENOENT')),
    );
    expect(await uploadVideoToBucket(params)).toBeUndefined();
    expect(sink.received).toHaveLength(0);
  });

  // A failed upload must not leave its full-size temporary file on the API disk for good.
  it('removes the temporary file when the bucket write fails', async () => {
    sink = bucketSink(new Error('bucket unavailable'));

    expect(await uploadVideoToBucket(params)).toBeUndefined();
    expect(mockUnlink).toHaveBeenCalledWith('tmp_videos_fixed/rec.webm');
  });

  // A file that cannot be read fails the upload (no unhandled stream error) and ends the bucket
  // write, so no half-written upload is left open.
  it('removes the temporary file when it cannot be read', async () => {
    mockCreateReadStream.mockImplementationOnce(() =>
      unreadable(new Error('EIO')),
    );

    expect(await uploadVideoToBucket(params)).toBeUndefined();
    expect(sink.received).toHaveLength(0);
    expect(sink.stream.destroyed).toBe(true);
    expect(mockUnlink).toHaveBeenCalledWith('tmp_videos_fixed/rec.webm');
  });

  it('returns nothing, without throwing, when neither the write nor the removal works', async () => {
    sink = bucketSink(new Error('bucket unavailable'));
    mockUnlink.mockRejectedValueOnce(new Error('EBUSY'));

    expect(await uploadVideoToBucket(params)).toBeUndefined();
    expect(mockUnlink).toHaveBeenCalledTimes(1);
  });
});
