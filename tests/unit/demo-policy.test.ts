import { describe, expect, it } from 'vitest';
import { allowDemoRequest } from '../../scripts/demo-policy.mjs';

const origin = 'http://127.0.0.1:4187';

const request = (
  path: string,
  method = 'GET',
  resourceType = 'document',
  body = '',
) => ({
  url: new URL(path, origin).href,
  method,
  resourceType,
  body,
  contentType: 'application/x-www-form-urlencoded',
});

describe('local demo request policy', () => {
  it('allows fixture pages, SvelteKit page data, and same-origin assets', () => {
    for (const path of [
      '/admin/links?search=guide',
      '/admin/links/seed-link-001/rules',
      '/admin/analytics/insights/__data.json?x-sveltekit-invalidated=11',
      '/admin/guardian',
      '/admin/integrations/mcp',
    ])
      expect(allowDemoRequest(request(path), origin)).toBe(true);
    expect(
      allowDemoRequest(request('/@vite/client', 'GET', 'script'), origin),
    ).toBe(true);
  });

  it('blocks packets to external origins, real redirects, secrets, and runtime endpoints', () => {
    for (const path of [
      'https://short.example.com/spring-launch',
      'http://localhost:4187/admin/links',
      '/spring-launch',
      '/admin/settings/security',
      '/admin/api-keys',
      '/api/v1/links',
      '/mcp',
      '/login',
      '/admin/links/another-link/rules',
      '/admin/links/seed-link-001%2Frules',
    ])
      expect(allowDemoRequest(request(path, 'GET', 'script'), origin)).toBe(
        false,
      );
    expect(
      allowDemoRequest(request('/@fs/etc/passwd', 'GET', 'document'), origin),
    ).toBe(false);
  });

  it('permits just the simulator and a Guardian check of the inactive sample', () => {
    expect(
      allowDemoRequest(
        request('/admin/links/seed-link-001/simulate', 'POST', 'fetch'),
        origin,
      ),
    ).toBe(true);
    expect(
      allowDemoRequest(
        request(
          '/admin/guardian?/check',
          'POST',
          'fetch',
          'linkId=seed-link-003',
        ),
        origin,
      ),
    ).toBe(true);
    for (const [path, body] of [
      ['/admin/links', ''],
      ['/admin/links/seed-link-001/rules', ''],
      ['/admin/links/seed-link-001/simulate?/delete', ''],
      ['/admin/analytics/insights?/generate', ''],
      ['/admin/analytics', ''],
      ['/admin/integrations/mcp', ''],
      ['/admin/guardian?/check', 'linkId=seed-link-001'],
      ['/admin/guardian?/check', 'linkId=seed-link-003&linkId=seed-link-001'],
      [
        '/admin/guardian?/check',
        'linkId=seed-link-003&pad=' + 'a'.repeat(2048),
      ],
    ])
      expect(
        allowDemoRequest(request(path, 'POST', 'fetch', body), origin),
      ).toBe(false);
  });
});
