import { dev } from '$app/env';
import { resolveShortLink } from '$lib/server/links/redirect';
import { normalizeHostname } from '$lib/server/security/url-policy';
import type { RequestHandler } from './$types';

const baseHeaders = {
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
};

const resolve: RequestHandler = async ({ params, locals, request, url }) => {
  const hostname = normalizeHostname(url.hostname, { allowLoopback: dev });
  if (!hostname)
    return new Response(null, { status: 404, headers: baseHeaders });
  if (!locals.env.DB)
    return new Response(null, { status: 503, headers: baseHeaders });

  try {
    const result = await resolveShortLink(
      locals.env.DB,
      hostname,
      params.slug,
      request,
      (request as Request & { cf?: IncomingRequestCfProperties }).cf,
    );
    return new Response(null, {
      status: result.status,
      headers:
        'location' in result
          ? { ...baseHeaders, location: result.location }
          : baseHeaders,
    });
  } catch {
    console.error('Short link lookup failed');
    return new Response(null, { status: 503, headers: baseHeaders });
  }
};

export const GET = resolve;
export const HEAD = resolve;

export const fallback: RequestHandler = () =>
  new Response(null, {
    status: 405,
    headers: { ...baseHeaders, allow: 'GET, HEAD' },
  });
