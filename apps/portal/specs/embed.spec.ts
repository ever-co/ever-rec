import { buildVideoEmbedCode, getVideoEmbedUrl } from 'app/utilities/embed';

describe('getVideoEmbedUrl', () => {
  it('maps a public video share link to the embed page', () => {
    expect(getVideoEmbedUrl('https://rec.example.com/video/shared/abc123')).toBe(
      'https://rec.example.com/video/shared/embed/abc123',
    );
  });

  it('keeps the workspace flag, and only that flag', () => {
    expect(
      getVideoEmbedUrl('https://rec.example.com/video/shared/abc123?ws=1'),
    ).toBe('https://rec.example.com/video/shared/embed/abc123?ws=1');
    expect(
      getVideoEmbedUrl('https://rec.example.com/video/shared/abc123?x=1&ws=0'),
    ).toBe('https://rec.example.com/video/shared/embed/abc123');
  });

  it('keeps the port and tolerates a trailing slash', () => {
    expect(getVideoEmbedUrl('http://localhost:4200/video/shared/abc123/')).toBe(
      'http://localhost:4200/video/shared/embed/abc123',
    );
  });

  it.each([
    '',
    'not a url',
    'javascript:alert(1)',
    'https://rec.example.com/image/shared/abc123',
    'https://rec.example.com/video/abc123',
    'https://rec.example.com/video/shared/',
    'https://rec.example.com/video/shared/embed/abc123',
  ])('returns null for %p', (input) => {
    expect(getVideoEmbedUrl(input)).toBeNull();
  });
});

describe('buildVideoEmbedCode', () => {
  const url = 'https://rec.example.com/video/shared/embed/abc123?ws=1';

  it('builds a lazy, fullscreen-capable iframe', () => {
    const code = buildVideoEmbedCode(url, 'Demo');
    expect(code).toContain(
      'src="https://rec.example.com/video/shared/embed/abc123?ws=1"',
    );
    expect(code).toContain('title="Demo"');
    expect(code).toContain('allowfullscreen');
    expect(code).toContain('loading="lazy"');
    // height follows the width, so a narrow container does not leave empty space
    expect(code).toContain('height:auto;aspect-ratio:16/9');
    expect(code.startsWith('<iframe ')).toBe(true);
    expect(code.endsWith('</iframe>')).toBe(true);
  });

  it('escapes the url and the user-controlled title', () => {
    const code = buildVideoEmbedCode(
      'https://rec.example.com/x?a=1&b="2"',
      `"><script>alert('x')</script>`,
    );
    expect(code).not.toContain('<script>');
    expect(code).toContain('src="https://rec.example.com/x?a=1&amp;b=&quot;2&quot;"');
    expect(code).toContain(
      'title="&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"',
    );
  });

  it('falls back to a default title and bounds a long one', () => {
    expect(buildVideoEmbedCode(url, '   ')).toContain('title="Rec video"');
    expect(buildVideoEmbedCode(url, null)).toContain('title="Rec video"');
    expect(buildVideoEmbedCode(url, 'a'.repeat(500))).toContain(
      `title="${'a'.repeat(200)}"`,
    );
  });

  it('collapses line breaks in the title', () => {
    expect(buildVideoEmbedCode(url, 'one\ntwo\t three')).toContain(
      'title="one two three"',
    );
  });
});
