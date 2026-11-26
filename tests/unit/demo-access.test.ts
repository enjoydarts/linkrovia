import { describe, expect, it } from 'vitest';
import {
  demoAdminRequest,
  publicDemoHost,
} from '../../src/lib/server/demo/access';

describe('public demo isolation', () => {
  it.each([
    'http://demo.linkrovia.com/',
    'https://demo.linkrovia.com:8443/',
    'https://demo.linkrovia.com./',
    'https://demo.linkrovia.com.example.net/',
    'https://another.linkrovia.com/',
  ])('requires the exact HTTPS demo host for %s', (url) => {
    expect(publicDemoHost(new URL(url), 'true')).toBe(false);
  });

  it('requires the explicit demo deployment flag', () => {
    const url = new URL('https://demo.linkrovia.com/');
    expect(publicDemoHost(url, undefined)).toBe(false);
    expect(publicDemoHost(url, 'false')).toBe(false);
    expect(publicDemoHost(url, 'true')).toBe(true);
  });

  it.each([
    ['/admin', 'GET', '', 'view'],
    ['/admin/links', 'HEAD', '', 'view'],
    ['/admin/links/[id]/analytics', 'GET', '?from=2026-11-01', 'view'],
    ['/admin/analytics/insights', 'GET', '', 'view'],
    ['/admin/links/[id]/simulate', 'POST', '', 'view'],
    ['/admin/links/[id]/simulate', 'POST', '?/futureAction', 'forbidden'],
    ['/admin/links/[id]', 'POST', '?/remove', 'forbidden'],
    ['/admin/analytics/insights', 'POST', '?/generate', 'forbidden'],
    ['/admin/links/[id]/rules', 'DELETE', '', 'forbidden'],
    ['/admin/links/new', 'GET', '', 'hidden'],
    ['/admin/links/[id]/analytics/export', 'GET', '', 'hidden'],
    ['/admin/settings/admins', 'GET', '', 'hidden'],
    ['/admin/api-keys', 'GET', '', 'hidden'],
    ['/admin/future-feature', 'GET', '', 'hidden'],
    ['/login', 'GET', '', 'outside'],
    ['/api/v1/links', 'GET', '', 'outside'],
    [null, 'GET', '', 'outside'],
  ])('scopes %s %s %s to %s', (route, method, search, decision) => {
    expect(demoAdminRequest(route, method, search)).toBe(decision);
  });
});
