import { fileURLToPath } from 'node:url';
import { demoGuardianLinkId } from './demo-fixtures.mjs';

const pages = new Set([
  '/admin',
  '/admin/links',
  '/admin/analytics',
  '/admin/analytics/insights',
  '/admin/guardian',
  '/admin/integrations/mcp',
]);
const linkPage =
  /^\/admin\/links\/seed-link-00[1-3](?:\/(?:rules|simulate|analytics))?$/;
const assetTypes = new Set(['script', 'stylesheet', 'font', 'image']);
const assetPath =
  /^\/(?:@vite\/|@id\/|node_modules\/|src\/|\.svelte-kit-e2e-|_app\/|brand\/)/;
const projectFilePrefix =
  '/@fs' + fileURLToPath(new URL('../', import.meta.url));

/** @param {string} pathname */
function localAsset(pathname) {
  if (pathname === '/favicon.ico' || assetPath.test(pathname)) return true;
  if (!pathname.startsWith(projectFilePrefix)) return false;
  return /^(?:node_modules\/|src\/|\.svelte-kit-e2e-|static\/)/.test(
    pathname.slice(projectFilePrefix.length),
  );
}

/**
 * @param {{url: string, method: string, resourceType: string, body?: string | null, contentType?: string}} request
 * @param {string} origin
 */
export function allowDemoRequest(request, origin) {
  const url = new URL(request.url);
  if (url.origin !== origin || url.username || url.password) return false;

  const { pathname } = url;
  if (request.method === 'GET' || request.method === 'HEAD') {
    const page = pathname.replace(/\/__data\.json$/, '');
    return (
      pages.has(page) ||
      linkPage.test(page) ||
      (assetTypes.has(request.resourceType) && localAsset(pathname))
    );
  }

  if (request.method !== 'POST') return false;
  if (linkPage.test(pathname) && pathname.endsWith('/simulate'))
    return url.search === '';

  if (pathname !== '/admin/guardian' || url.search !== '?/check') return false;
  const { body, contentType } = request;
  if (
    !body ||
    Buffer.byteLength(body) > 2048 ||
    contentType?.split(';', 1)[0]?.trim() !==
      'application/x-www-form-urlencoded'
  )
    return false;
  const [linkId, duplicate] = new URLSearchParams(body).getAll('linkId');
  return linkId === demoGuardianLinkId && duplicate === undefined;
}
