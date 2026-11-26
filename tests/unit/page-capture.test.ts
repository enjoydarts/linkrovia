import { describe, expect, it, vi } from 'vitest';
import {
  buildPageCaptureBookmarklet,
  readPageCapture,
} from '../../src/lib/links/page-capture';

function runBookmarklet(
  pageUrl: string,
  head: Record<string, string>,
  title = 'Document title',
) {
  const assign = vi.fn();
  const document = {
    title,
    querySelector: (selector: string) => ({
      getAttribute: () => head[selector],
    }),
  };
  const code = buildPageCaptureBookmarklet('https://admin.example.com');
  expect(code).toMatch(/^javascript:/);
  const run = new Function(
    'document',
    'location',
    decodeURIComponent(code.slice(11)),
  );
  run(document, { href: pageUrl, assign });
  return assign;
}

describe('browser page metadata capture', () => {
  it('prefers the Open Graph title and description and keeps the destination intact', () => {
    const page = 'https://example.org/article?item=1#section';
    const assign = runBookmarklet(page, {
      'meta[property="og:title"]': 'Open Graph title',
      'meta[property="og:description"]': '  Open Graph\n description  ',
      'meta[name="description"]': 'Generic description',
    });
    const target = new URL(assign.mock.calls[0][0]);
    expect(target.origin + target.pathname).toBe(
      'https://admin.example.com/admin/links/new',
    );
    expect(target.search).toBe('');
    expect(readPageCapture(target.hash)).toEqual({
      destinationUrl: page,
      title: 'Open Graph title',
      description: 'Open Graph description',
    });
  });

  it('falls back to the document title and standard description', () => {
    const assign = runBookmarklet('https://example.org/article', {
      'meta[name="description"]': 'Article description',
    });
    expect(
      readPageCapture(new URL(assign.mock.calls[0][0]).hash),
    ).toMatchObject({
      title: 'Document title',
      description: 'Article description',
    });
  });

  it('ignores management pages and refuses invalid or oversized captures', () => {
    expect(
      runBookmarklet('https://admin.example.com/admin', {}),
    ).not.toHaveBeenCalled();
    expect(
      runBookmarklet('https://user:password@example.org/', {}),
    ).not.toHaveBeenCalled();
    expect(readPageCapture('#linkrovia-page=not-json')).toBeNull();
    expect(readPageCapture('#linkrovia-page=' + 'x'.repeat(24_001))).toBeNull();
    const query = new URLSearchParams({
      'linkrovia-page': JSON.stringify({
        destinationUrl: 'javascript:alert(1)',
        title: '',
        description: '',
      }),
    });
    expect(readPageCapture('#' + query)).toBeNull();
  });
});
