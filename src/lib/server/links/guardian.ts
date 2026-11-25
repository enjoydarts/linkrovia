import { checkPublicDns, type DnsResult } from '../domains/dns';
import { isValidSlug } from '../security/slug';
import { normalizeHostname, parseDestinationUrl } from '../security/url-policy';
import { resolveShortLink } from './redirect';
import type { LinkSummary } from './store';

const maxHops = 8;

type Hop = { hostname: string; slug: string };
type CheckStatus =
  | 'loop'
  | 'inactive_or_missing'
  | 'protected'
  | 'expired'
  | 'outside_local_chain'
  | 'limit_reached';

type GuardianResult = {
  status: CheckStatus;
  checkedHops: number;
  loop: Hop[];
  dns: DnsResult | null;
};

function parseHop(url: URL): Hop | null {
  if (url.protocol !== 'https:' || url.port !== '') return null;
  const hostname = normalizeHostname(url.hostname);
  // The router decodes the parameter once. Limit the check to exact
  // single-segment paths for which the slug is valid.
  try {
    const slug = decodeURIComponent(url.pathname.slice(1));
    return hostname && isValidSlug(slug) ? { hostname, slug } : null;
  } catch {
    return null;
  }
}

async function isStoredHostname(db: D1Database, hostname: string) {
  return (
    (await db
      .prepare('SELECT 1 FROM domains WHERE hostname = ?')
      .bind(hostname)
      .first()) !== null
  );
}

export async function checkGuardianLink(
  db: D1Database,
  link: Pick<LinkSummary, 'id' | 'hostname' | 'slug'>,
  lookupDns: typeof checkPublicDns = checkPublicDns,
): Promise<GuardianResult> {
  const visited: Hop[] = [];
  const seen = new Map<string, number>();
  const result = (
    status: CheckStatus,
    loop: Hop[] = [],
    dns: DnsResult | null = null,
  ): GuardianResult => ({ status, checkedHops: visited.length, loop, dns });

  const hostname = normalizeHostname(link.hostname);
  if (!hostname || !isValidSlug(link.slug))
    return result('inactive_or_missing');
  let url = new URL(`https://${hostname}/${link.slug}`);

  while (true) {
    const hop = parseHop(url);
    if (hop) {
      const key = `${hop.hostname}/${hop.slug}`;
      const firstSeen = seen.get(key);
      if (firstSeen !== undefined)
        return result('loop', visited.slice(firstSeen));
      if (visited.length >= maxHops) return result('limit_reached');

      // HEAD without credentials follows the public resolver's read-only path.
      // Request is only a value passed to the resolver and is never sent.
      const resolved = await resolveShortLink(
        db,
        hop.hostname,
        hop.slug,
        new Request(url, { method: 'HEAD' }),
      );
      if (resolved.status === 410) return result('expired');
      if ('location' in resolved) {
        if (!('linkId' in resolved)) return result('protected');
        if (visited.length === 0 && resolved.linkId !== link.id)
          return result('inactive_or_missing');
        seen.set(key, visited.length);
        visited.push(hop);
        const destination = parseDestinationUrl(resolved.location);
        if (!destination) return result('outside_local_chain');
        url = destination;
        continue;
      }
      if (visited.length === 0 || (await isStoredHostname(db, hop.hostname)))
        return result('inactive_or_missing');
    }

    // Only external hostnames reach the fixed DNS resolver. Inspect one
    // terminal host, with no HTTP request to the destination.
    const outsideHost = normalizeHostname(url.hostname);
    if (!outsideHost || (!hop && (await isStoredHostname(db, outsideHost))))
      return result('outside_local_chain');
    return result('outside_local_chain', [], await lookupDns(outsideHost));
  }
}
