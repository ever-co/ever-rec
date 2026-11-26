/**
 * `uploadOptions()` gives every upload route multer options that cap the file size and the number
 * of files, text fields and parts, so that no request can make the API hold an unbounded upload in
 * memory. The checks with multer run its real parser on real forms.
 */
import { createServer } from 'http';
import multer from 'multer';
import request from 'supertest';
import {
  MAX_UPLOAD_FIELD_BYTES,
  MAX_UPLOAD_FIELDS,
  UploadLimits,
  uploadOptions,
} from './upload-limits';

describe('uploadOptions', () => {
  it('caps every part of a form, with one file by default', () => {
    expect(uploadOptions({ fileSize: 1000 })).toEqual({
      limits: {
        fileSize: 1000,
        files: 1,
        fields: MAX_UPLOAD_FIELDS,
        fieldSize: MAX_UPLOAD_FIELD_BYTES,
        parts: MAX_UPLOAD_FIELDS + 2,
      },
    });
  });

  it('takes the caps of the route', () => {
    expect(
      uploadOptions({ fileSize: 10, files: 3, fields: 2, fieldSize: 5 }),
    ).toEqual({
      limits: { fileSize: 10, files: 3, fields: 2, fieldSize: 5, parts: 6 },
    });
  });

  it('keeps the other multer options of the route', () => {
    const storage = multer.memoryStorage();
    expect(uploadOptions({ fileSize: 10 }, { storage }).storage).toBe(storage);
  });

  describe('with multer', () => {
    const limits: UploadLimits = { fileSize: 8, files: 2, fields: 3 };
    const upload = multer(uploadOptions(limits) as multer.Options).any();
    const server = createServer((req, res) => {
      upload(req as any, res as any, (error) => {
        res.statusCode = error ? 400 : 200;
        res.end(error ? error.code : 'ok');
      });
    });
    const send = (fields: number, files: number, fileSize = 4) => {
      let form = request(server).post('/');
      for (let index = 0; index < fields; index++) {
        form = form.field(`field${index}`, 'x');
      }
      for (let index = 0; index < files; index++) {
        form = form.attach(`file${index}`, Buffer.alloc(fileSize, 1), 'a.bin');
      }
      return form;
    };

    // The parser refuses a form once it has read `parts` parts, the last one too.
    it('takes a form with as many fields and files as the caps allow', async () => {
      const response = await send(3, 2).expect(200);
      expect(response.text).toBe('ok');
    });

    it.each([
      ['a field too many', 4, 2, 4, 'LIMIT_FIELD_COUNT'],
      ['a file too many', 3, 3, 4, 'LIMIT_FILE_COUNT'],
      ['a file that reaches the size cap', 0, 1, 8, 'LIMIT_FILE_SIZE'],
    ])('refuses %s', async (_name, fields, files, fileSize, code) => {
      const response = await send(fields, files, fileSize).expect(400);
      expect(response.text).toBe(code);
    });

    it('refuses a field longer than the cap', async () => {
      const response = await request(server)
        .post('/')
        .field('long', 'x'.repeat(MAX_UPLOAD_FIELD_BYTES + 1))
        .expect(400);
      expect(response.text).toBe('LIMIT_FIELD_VALUE');
    });
  });
});
