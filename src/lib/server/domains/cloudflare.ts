export type CloudflareInput = {
  accountId: string;
  zoneId: string;
  token: string;
};

type CloudflareOutcome = {
  code:
    | 'ready'
    | 'attached'
    | 'unsupported'
    | 'permissions'
    | 'conflict'
    | 'provider_error';
  zoneName?: string;
  service?: string;
};

const idPattern = /^[0-9a-f]{32}$/i;
const label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const hostnamePattern = new RegExp(`^${label}(?:\\.${label})+$`);
const workerHostnamePattern = new RegExp(
  `^(${label})\\.(${label})\\.workers\\.dev$`,
);
const maxResponseBytes = 256 * 1024;

function validId(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length === 32 && idPattern.test(value)
  );
}

function validHostname(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 253 &&
    value === value.trim() &&
    hostnamePattern.test(value)
  );
}

export function parseCloudflareInput(raw: {
  accountId: unknown;
  zoneId: unknown;
  token: unknown;
}): CloudflareInput | null {
  const { accountId, zoneId, token } = raw;
  if (
    !validId(accountId) ||
    !validId(zoneId) ||
    typeof token !== 'string' ||
    token.length < 32 ||
    token.length > 128 ||
    /[^A-Za-z0-9_-]/.test(token) ||
    /^[0-9a-f]{37}$/i.test(token)
  ) {
    return null;
  }
  return {
    accountId: accountId.toLowerCase(),
    zoneId: zoneId.toLowerCase(),
    token,
  };
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

class ProviderFailure extends Error {
  constructor(readonly code: 'permissions' | 'provider_error') {
    super(code);
  }
}

async function responseJSON(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderFailure('provider_error');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let content = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(content + decoder.decode()) as unknown;
      size += value.byteLength;
      if (size > maxResponseBytes) throw new ProviderFailure('provider_error');
      content += decoder.decode(value, { stream: true });
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
}

function client(input: CloudflareInput, send: typeof fetch) {
  const signal = AbortSignal.timeout(5000);
  return async (path: string) => {
    const response = await send(`https://api.cloudflare.com/client/v4${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${input.token}` },
      redirect: 'manual',
      signal,
    });
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new ProviderFailure(
        response.status === 401 || response.status === 403
          ? 'permissions'
          : 'provider_error',
      );
    }
    const envelope = object(await responseJSON(response));
    if (envelope?.success !== true) throw new ProviderFailure('provider_error');
    return envelope;
  };
}

type CloudflareClient = ReturnType<typeof client>;

async function list(
  api: CloudflareClient,
  path: string,
  stopAtFirstResult = false,
): Promise<unknown[]> {
  const { result, result_info } = await api(path);
  if (!Array.isArray(result)) throw new ProviderFailure('provider_error');
  if (stopAtFirstResult && result.length) return result;
  const info = object(result_info);
  if (
    (result_info !== undefined && !info) ||
    (info?.total_pages !== undefined &&
      info.total_pages !== 0 &&
      info.total_pages !== 1) ||
    (info?.page !== undefined && info.page !== 1) ||
    (info?.cursor !== undefined && info.cursor !== null && info.cursor !== '')
  ) {
    throw new ProviderFailure('provider_error');
  }
  return result;
}

async function scope(
  input: CloudflareInput,
  hostname: string,
  managementHostname: string,
  send: typeof fetch,
) {
  const scoped = parseCloudflareInput(input);
  const worker = workerHostnamePattern.exec(managementHostname);
  if (
    !scoped ||
    !validHostname(managementHostname) ||
    !worker ||
    !validHostname(hostname) ||
    hostname.endsWith('.workers.dev') ||
    hostname === 'workers.dev'
  ) {
    return null;
  }
  const [, service, accountSubdomain] = worker;
  const api = client(scoped, send);
  const workers = `/accounts/${scoped.accountId}/workers`;
  const zones = `/zones/${scoped.zoneId}`;
  const [subdomain, zone] = await Promise.all([
    api(`${workers}/subdomain`),
    api(zones),
  ]);
  const subdomainResult = object(subdomain.result);
  const zoneResult = object(zone.result);
  const zoneName = zoneResult?.name;
  if (
    subdomainResult?.subdomain !== accountSubdomain ||
    zoneResult?.id !== scoped.zoneId ||
    object(zoneResult.account)?.id !== scoped.accountId ||
    zoneResult.status !== 'active' ||
    zoneResult.type !== 'full' ||
    !validHostname(zoneName) ||
    (hostname !== zoneName && !hostname.endsWith(`.${zoneName}`))
  ) {
    return null;
  }
  return { api, workers, zones, zoneId: scoped.zoneId, zoneName, service };
}

function matchesRoute(value: unknown, hostname: string): boolean {
  const pattern = object(value)?.pattern;
  if (typeof pattern !== 'string') throw new ProviderFailure('provider_error');
  const host = pattern
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .toLowerCase();
  const suffix = host.startsWith('*') ? host.slice(1) : host;
  if (!validHostname(suffix.replace(/^\./, '')))
    throw new ProviderFailure('provider_error');
  return host.startsWith('*') ? hostname.endsWith(suffix) : hostname === host;
}

function domainMatches(
  domain: Record<string, unknown> | null,
  hostname: string,
  settings: { zoneName: string; zoneId: string; service: string },
): boolean {
  return (
    validId(domain?.id) &&
    domain.hostname === hostname &&
    domain.zone_name === settings.zoneName &&
    domain.zone_id === settings.zoneId &&
    domain.service === settings.service &&
    domain.environment === 'production' &&
    domain.enabled === true
  );
}

function failure(error: unknown): CloudflareOutcome {
  return {
    code: error instanceof ProviderFailure ? error.code : 'provider_error',
  };
}

export async function diagnoseCustomDomain(
  input: CloudflareInput,
  hostname: string,
  managementHostname: string,
  send = fetch,
): Promise<CloudflareOutcome> {
  try {
    const settings = await scope(input, hostname, managementHostname, send);
    if (!settings) return { code: 'unsupported' };
    const { api, workers, zones, service, zoneName } = settings;
    const details = { service, zoneName };
    const dnsQuery = new URLSearchParams({
      'name.exact': hostname,
      per_page: '1',
    });
    // DNS delegation can shadow records at a non-apex hostname or an ancestor.
    const delegationQuery = new URLSearchParams({
      shadowing_name: hostname,
      per_page: '1',
    });
    const [domains, routes, dns, delegation] = await Promise.all([
      list(api, `${workers}/domains?${new URLSearchParams({ hostname })}`),
      list(api, `${zones}/workers/routes`),
      list(api, `${zones}/dns_records?${dnsQuery}`, true),
      hostname === zoneName
        ? []
        : list(api, `${zones}/dns_records?${delegationQuery}`, true),
    ]);
    if (
      routes.some((route) => matchesRoute(route, hostname)) ||
      delegation.length
    ) {
      return { code: 'conflict', ...details };
    }
    if (domains.length) {
      const domain = object(domains[0]);
      return domains.length === 1 && domainMatches(domain, hostname, settings)
        ? { code: 'attached', ...details }
        : { code: 'conflict', ...details };
    }
    return { code: dns.length ? 'conflict' : 'ready', ...details };
  } catch (error) {
    return failure(error);
  }
}
