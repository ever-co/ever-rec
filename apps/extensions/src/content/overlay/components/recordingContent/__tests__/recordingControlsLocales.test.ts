import fs from 'fs';
import path from 'path';
import { describe, expect, it } from '@jest/globals';

const localesDir = path.resolve(__dirname, '../../../../../../i18n/locales');
const locales = fs
  .readdirSync(localesDir)
  .filter((file) => file.endsWith('.json'));

describe('recording bar locale strings', () => {
  it('finds all 13 locales', () => {
    expect(locales).toHaveLength(13);
  });

  it.each(locales)(
    '%s names the colour swatch and the brush-size slider',
    (file) => {
      const { recordingControls } = JSON.parse(
        fs.readFileSync(path.join(localesDir, file), 'utf8'),
      ).ext;

      for (const key of ['penColor', 'brushSize']) {
        expect(typeof recordingControls[key]).toBe('string');
        expect(recordingControls[key].trim()).not.toBe('');
      }
    },
  );
});
