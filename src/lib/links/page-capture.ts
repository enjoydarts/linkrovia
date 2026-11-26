const captureKey = 'linkrovia-page';
const maxUrlLength = 4096;
const maxTitleLength = 200;
const maxDescriptionLength = 700;
const maxHashLength = 24_000;

type PageCapture = {
  destinationUrl: string;
  title: string;
  description: string;
};

export function buildPageCaptureBookmarklet(origin: string): string {
  const app = new URL(origin);
  const formUrl = new URL('/admin/links/new', app);
  const code = `(() => {
    const current = new URL(location.href);
    if (!['http:', 'https:'].includes(current.protocol) || current.origin === ${JSON.stringify(app.origin)} || current.username || current.password || current.href.length > ${maxUrlLength}) return;
    const clean = (value, limit) => (value || '').replace(/[\\x00-\\x1f\\x7f\\s]+/g, ' ').trim().slice(0, limit);
    const meta = (selector, limit) => clean(document.querySelector(selector)?.getAttribute('content'), limit);
    const title = meta('meta[property="og:title"]', ${maxTitleLength}) || clean(document.title, ${maxTitleLength});
    const description = meta('meta[property="og:description"]', ${maxDescriptionLength}) || meta('meta[name="description"]', ${maxDescriptionLength});
    const hash = new URLSearchParams({ ${JSON.stringify(captureKey)}: JSON.stringify({ destinationUrl: current.href, title, description }) });
    location.assign(${JSON.stringify(formUrl.href)} + '#' + hash.toString());
  })()`;
  return 'javascript:' + encodeURIComponent(code);
}

export function readPageCapture(hash: string): PageCapture | null {
  if (!hash.startsWith('#') || hash.length > maxHashLength) return null;
  const params = new URLSearchParams(hash.slice(1));
  const entries = params.getAll(captureKey);
  if (entries.length !== 1 || params.size !== 1) return null;
  try {
    const captured: unknown = JSON.parse(entries[0]);
    if (!captured || typeof captured !== 'object' || Array.isArray(captured))
      return null;
    const { destinationUrl, title, description } = captured as Record<
      string,
      unknown
    >;
    if (
      typeof destinationUrl !== 'string' ||
      destinationUrl.length > maxUrlLength ||
      /[\x00-\x20\x7f\\]/.test(destinationUrl) ||
      typeof title !== 'string' ||
      typeof description !== 'string'
    )
      return null;
    const url = new URL(destinationUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    const clean = (value: string, limit: number) =>
      value
        .replace(/[\x00-\x1f\x7f\s]+/g, ' ')
        .trim()
        .slice(0, limit);
    return {
      destinationUrl: url.href,
      title: clean(title, maxTitleLength),
      description: clean(description, maxDescriptionLength),
    };
  } catch {
    return null;
  }
}
