/**
 * The uploader returns the bucket file once it is written, and nothing when it is not. A temporary
 * file it cannot remove afterwards does not hide the write: the trim flow must still learn that an
 * older cut replaced the master file, to mark it stale (streamService markMasterUploaded).
 */
import { uploadVideoToBucket } from './uploadVideoToBucket';

const mockSave = jest.fn<Promise<void>, [Buffer]>();
const mockFile = jest.fn((path: string) => ({ path, save: mockSave }));
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => ({ file: mockFile }) }),
}));

const mockReadFile = jest.fn<Promise<Buffer>, [string]>();
const mockUnlink = jest.fn<Promise<void>, [string]>();
jest.mock('fs/promises', () => ({
  readFile: (path: string) => mockReadFile(path),
  unlink: (path: string) => mockUnlink(path),
}));

jest.mock('./fixVideoWithFFMPEG', () => ({ fixVideoWithFFMPEG: jest.fn() }));

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
    mockSave.mockReset().mockResolvedValue(undefined);
    mockFile.mockClear();
    mockReadFile.mockReset().mockResolvedValue(Buffer.from('video'));
    mockUnlink.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the file it wrote to the bucket and removes the temporary file', async () => {
    const fileRef = await uploadVideoToBucket(params);

    expect(mockFile).toHaveBeenCalledWith('users/uid-me/videos/vid1.webm');
    expect(mockSave).toHaveBeenCalledWith(Buffer.from('video'));
    expect(mockUnlink).toHaveBeenCalledWith('tmp_videos_fixed/rec.webm');
    expect(fileRef).toMatchObject({ path: 'users/uid-me/videos/vid1.webm' });
  });

  it('still returns the written file when the temporary file cannot be removed', async () => {
    mockUnlink.mockRejectedValueOnce(new Error('EBUSY'));

    const fileRef = await uploadVideoToBucket(params);

    expect(mockSave).toHaveBeenCalled();
    expect(fileRef).toMatchObject({ path: 'users/uid-me/videos/vid1.webm' });
    expect(console.error).toHaveBeenCalled();
  });

  it('returns nothing when the bucket was not written', async () => {
    mockSave.mockRejectedValueOnce(new Error('bucket unavailable'));
    expect(await uploadVideoToBucket(params)).toBeUndefined();

    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
    expect(await uploadVideoToBucket(params)).toBeUndefined();
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
