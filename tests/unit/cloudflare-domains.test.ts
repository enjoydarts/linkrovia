import { describe, expect, it, vi } from 'vitest';
import {
  diagnoseCustomDomain,
  parseCloudflareInput,
} from '../../src/lib/server/domains/cloudflare';

const accountId = 'a'.repeat(32);
const zoneId = 'b'.repeat(32);
const domainId = 'c'.repeat(32);
const token = 'scoped-token_'.repeat(4);
const input = { accountId, zoneId, token };
const hostname = 'go.example.com';
const management = 'linkrovia.account.workers.dev';
const zone = {
  id: zoneId,
  account: { id: accountId },
  name: 'example.com',
  status: 'active',
  type: 'full',
};
const domain = {
  id: domainId,
  hostname,
  zone_id: zoneId,
  zone_name: zone.name,
  service: 'linkrovia',
  environment: 'production',
  enabled: true,
};
const workers = `/client/v4/accounts/${accountId}/workers`;
const zones = `/client/v4/zones/${zoneId}`;

function provider(overrides: Record<string, unknown> = {}) {
  const results: Record<string, unknown> = {
    [`${workers}/subdomain`]: { subdomain: 'account' },
    [zones]: zone,
    [`${workers}/domains`]: [],
    [`${zones}/workers/routes`]: [],
    [`${zones}/dns_records`]: [],
    ...overrides,
  };
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const endpoint = new URL(String(url));
    expect(endpoint.origin).toBe('https://api.cloudflare.com');
    expect(init?.redirect).toBe('manual');
    expect(new Headers(init?.headers).get('authorization')).toBe(
      `Bearer ${token}`,
    );
    const result =
      results[endpoint.pathname + endpoint.search] ??
      results[endpoint.pathname];
    if (result instanceof Response) return result;
    return Response.json({ success: true, result });
  });
}

describe('Cloudflare Custom Domain provider', () => {
  it('validates IDs and rejects credentials with control characters or Global API key syntax', () => {
    expect(parseCloudflareInput(input)).toEqual(input);
    expect(
      parseCloudflareInput({ ...input, accountId: accountId + '\n' }),
    ).toBeNull();
    expect(parseCloudflareInput({ ...input, zoneId: '../zones' })).toBeNull();
    expect(parseCloudflareInput({ ...input, token: token + '\n' })).toBeNull();
    expect(
      parseCloudflareInput({ ...input, token: 'a'.repeat(37) }),
    ).toBeNull();
  });

  it('runs read-only diagnostics', async () => {
    const send = provider();
    expect(
      await diagnoseCustomDomain(input, hostname, management, send),
    ).toEqual({
      code: 'ready',
      service: 'linkrovia',
      zoneName: 'example.com',
    });
    expect(send.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(
      true,
    );
  });

  it('rejects a mismatched account subdomain or a zone that is partial or belongs to a different account', async () => {
    for (const overrides of [
      { [`${workers}/subdomain`]: { subdomain: 'different' } },
      { [zones]: { ...zone, type: 'partial' } },
      { [zones]: { ...zone, account: { id: 'd'.repeat(32) } } },
    ]) {
      expect(
        await diagnoseCustomDomain(
          input,
          hostname,
          management,
          provider(overrides),
        ),
      ).toEqual({ code: 'unsupported' });
    }
    expect(
      await diagnoseCustomDomain(
        input,
        hostname,
        'admin.example.com',
        provider(),
      ),
    ).toEqual({ code: 'unsupported' });
  });

  it('recognizes any matching route, exact DNS records, and disabled or foreign mappings as conflicts', async () => {
    for (const overrides of [
      {
        [`${zones}/workers/routes`]: [
          { pattern: 'HTTPS://*.EXAMPLE.COM/any/path*' },
        ],
      },
      { [`${zones}/dns_records`]: [{ name: hostname, type: 'TXT' }] },
      {
        [`${zones}/dns_records?shadowing_name=${hostname}&per_page=1`]:
          Response.json({
            success: true,
            result: [{ name: hostname, type: 'NS' }],
            result_info: { total_pages: 2, page: 1 },
          }),
      },
      { [`${workers}/domains`]: [{ ...domain, enabled: false }] },
      { [`${workers}/domains`]: [{ ...domain, service: 'another-worker' }] },
    ]) {
      expect(
        await diagnoseCustomDomain(
          input,
          hostname,
          management,
          provider(overrides),
        ),
      ).toMatchObject({ code: 'conflict' });
    }
  });

  it('reports an existing enabled mapping on the expected zone and Worker', async () => {
    const send = provider({ [`${workers}/domains`]: [domain] });
    expect(
      await diagnoseCustomDomain(input, hostname, management, send),
    ).toEqual({
      code: 'attached',
      service: 'linkrovia',
      zoneName: 'example.com',
    });
  });

  it('maps denied and invalid provider replies without returning provider data', async () => {
    const url = `${workers}/subdomain`;
    for (const [response, code] of [
      [Response.json({ token }, { status: 403 }), 'permissions'],
      [
        new Response(token, {
          status: 302,
          headers: { Location: 'https://example.com' },
        }),
        'provider_error',
      ],
      [new Response('x'.repeat(300_000)), 'provider_error'],
    ] as const) {
      expect(
        await diagnoseCustomDomain(
          input,
          hostname,
          management,
          provider({ [url]: response }),
        ),
      ).toEqual({ code });
    }
  });

  it('fails closed when the provider returns only part of the route or mapping list', async () => {
    for (const path of [`${zones}/workers/routes`, `${workers}/domains`]) {
      const send = provider({
        [path]: Response.json({
          success: true,
          result: [],
          result_info: { total_pages: 2, page: 1 },
        }),
      });
      expect(
        await diagnoseCustomDomain(input, hostname, management, send),
      ).toEqual({
        code: 'provider_error',
      });
      expect(send.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(
        true,
      );
    }
  });
});
