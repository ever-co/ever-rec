/**
 * POST /soundshots/upload/file takes the file with `FileInterceptor` and no storage, and the API has
 * no MulterModule, so multer keeps the upload in memory: `file.buffer` holds the bytes and
 * `file.path` is undefined. `uploadSoundshot` read `file.path` from disk, which threw, so with a
 * Firebase session no recording was ever stored (no Storage object, no `soundshots` record) while
 * the controller still answered 'success'. The service now uploads `file.buffer` and reads from
 * disk only when a disk storage set `file.path`; a request with no file or no MIME type gets an
 * error response before anything is stored, and never a throw (the Firebase uploader runs first in
 * the pipeline, and a throw would skip the Gauzy uploader).
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { promises as fsp } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { MediaDbService } from 'src/common/media/services/media-db.service';
import { MediaUploadService } from 'src/common/media/services/media-upload.service';
import { ResStatusEnum } from '../../enums/ResStatusEnum';
import { SoundshotService } from './soundshot.service';

jest.mock('src/common/media/services/media-upload.service', () => ({
  MediaUploadService: class {},
}));
jest.mock('src/common/media/services/media-db.service', () => ({
  MediaDbService: class {},
}));

const uid = 'user-1';

describe('SoundshotService.uploadSoundshot', () => {
  let service: SoundshotService;
  let upload: jest.Mock;
  let create: jest.Mock;
  let emit: jest.Mock;

  beforeEach(async () => {
    upload = jest.fn().mockResolvedValue({
      url: 'https://storage.test/signed',
      metadata: { name: 'ref', timeCreated: '2026-11-18T00:00:00Z' },
    });
    create = jest.fn().mockResolvedValue({ id: 'record-1' });
    emit = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        SoundshotService,
        { provide: MediaUploadService, useValue: { upload } },
        { provide: MediaDbService, useValue: { create } },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();

    service = moduleRef.get(SoundshotService);
  });

  it('stores the bytes of an in-memory upload and answers success', async () => {
    const buffer = Buffer.from('webm audio bytes');
    const file = {
      fieldname: 'file',
      originalname: 'recording.webm',
      mimetype: 'audio/webm',
      size: buffer.length,
      buffer,
    } as Express.Multer.File;

    const result = await service.uploadSoundshot({
      userId: uid,
      file,
      title: 'Standup',
      duration: 12,
      folderId: 'folder-1',
    });

    expect(result.status).toBe(ResStatusEnum.success);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toEqual(
      expect.objectContaining({ uid, itemType: 'soundshots' }),
    );
    expect(upload.mock.calls[0][0].buffer).toBe(buffer);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        uid,
        mediaType: 'soundshots',
        data: expect.objectContaining({
          refName: upload.mock.calls[0][0].filename,
          title: 'Standup',
          duration: 12,
          parentId: 'folder-1',
          mimeType: 'audio/webm',
        }),
      }),
    );
    expect(result.data).toEqual({
      url: 'https://storage.test/signed',
      ref: { name: 'ref', timeCreated: '2026-11-18T00:00:00Z' },
      dbData: { id: 'record-1' },
    });
  });

  it('still reads the bytes from disk when a disk storage set file.path', async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'soundshot-spec-'));
    const filePath = path.join(dir, 'recording.webm');
    await fsp.writeFile(filePath, 'bytes on disk');
    try {
      const result = await service.uploadSoundshot({
        userId: uid,
        file: {
          originalname: 'recording.webm',
          mimetype: 'audio/webm',
          filename: 'recording.webm',
          path: filePath,
        } as Express.Multer.File,
      });

      expect(result.status).toBe(ResStatusEnum.success);
      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload.mock.calls[0][0].filename).toBe('recording.webm');
      expect(upload.mock.calls[0][0].buffer.toString()).toBe('bytes on disk');
    } finally {
      await fsp.rm(dir, { recursive: true, force: true });
    }
  });

  it('writes the record without undefined values when title and duration are missing', async () => {
    // The Realtime Database's set() throws on an undefined value, after the file is in Storage.
    const result = await service.uploadSoundshot({
      userId: uid,
      file: {
        fieldname: 'file',
        originalname: 'blob',
        mimetype: 'audio/webm',
        buffer: Buffer.from('webm audio bytes'),
      } as Express.Multer.File,
    });

    expect(result.status).toBe(ResStatusEnum.success);
    expect(create).toHaveBeenCalledTimes(1);
    const { data } = create.mock.calls[0][0];
    const undefinedKeys = Object.keys(data).filter(
      (key) => data[key] === undefined,
    );
    expect(undefinedKeys).toEqual([]);
    expect(data).toEqual(
      expect.objectContaining({ title: null, duration: null, parentId: false }),
    );
  });

  it.each([
    ['no file', undefined],
    [
      'a file with neither bytes nor a path',
      { originalname: 'a.webm', mimetype: 'audio/webm' },
    ],
    [
      'an empty file',
      {
        originalname: 'a.webm',
        mimetype: 'audio/webm',
        buffer: Buffer.alloc(0),
        size: 0,
      },
    ],
  ])(
    'answers an error and stores nothing for %s, without throwing',
    async (_case, file) => {
      const result = await service.uploadSoundshot({
        userId: uid,
        file: file as Express.Multer.File,
      });

      expect(result.status).toBe(ResStatusEnum.error);
      expect(result.message).toBe('No audio file was uploaded.');
      expect(result.data).toBeNull();
      expect(upload).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('answers an error and stores nothing for a file with no MIME type', async () => {
    const result = await service.uploadSoundshot({
      userId: uid,
      file: {
        originalname: 'recording.webm',
        buffer: Buffer.from('bytes'),
      } as Express.Multer.File,
    });

    expect(result.status).toBe(ResStatusEnum.error);
    expect(result.message).toBe(
      'Invalid file type. Only audio files are allowed.',
    );
    expect(upload).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
