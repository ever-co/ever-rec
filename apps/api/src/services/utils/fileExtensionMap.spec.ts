/**
 * `videoFileExtension` is the extension a video upload is stored and converted under. ffmpeg picks
 * the output format from that extension, so only container types it can write get one. text/plain
 * (what a part without a Content-Type is reported as), application/octet-stream, documents and
 * images have an entry in `fileExtensionMap`, but no video can be written as `.xdr`, `.xtp` or
 * `.pdf`.
 */
import { fileExtensionMap, videoFileExtension } from './fileExtensionMap';

describe('videoFileExtension', () => {
  it.each([
    ['video/mp4', '.mp4'],
    ['video/webm', '.webm'],
    ['video/quicktime', '.mov'],
    ['video/ogg', '.ogg'],
    ['audio/ogg', '.ogg'],
    ['video/avi', '.avi'],
    ['video/x-flv', '.flv'],
    ['video/x-ms-wmv', '.wmv'],
  ])('gives %s the extension %s', (type, extension) => {
    expect(videoFileExtension(type)).toBe(extension);
  });

  it.each([
    'text/plain',
    'application/octet-stream',
    'application/pdf',
    'text/html',
    'image/svg+xml',
    'image/png',
    'audio/mpeg',
    // Mapped to `.mpv2`, `.IVF` and `.nsc`: no ffmpeg muxer takes those (or, for IVF, H.264).
    'video/mpeg',
    'video/x-ivf',
    'video/x-ms-asf',
    'video/x-matroska',
    '',
    undefined,
    '__proto__',
    'constructor',
  ])('gives %s none', (type) => {
    expect(videoFileExtension(type)).toBeUndefined();
  });

  it('leaves fileExtensionMap whole for the other uploads', () => {
    expect(fileExtensionMap['image/png']).toBe('.png');
    expect(fileExtensionMap['text/plain']).toBe('.xdr');
  });
});
