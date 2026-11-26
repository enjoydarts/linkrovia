const demoPages = new Set([
  '/admin',
  '/admin/analytics',
  '/admin/analytics/conversions',
  '/admin/analytics/insights',
  '/admin/guardian',
  '/admin/links',
  '/admin/links/new',
  '/admin/links/[id]',
  '/admin/links/[id]/analytics',
  '/admin/links/[id]/conversions',
  '/admin/links/[id]/rules',
  '/admin/links/[id]/simulate',
  '/admin/settings',
  '/admin/settings/ai',
  '/admin/settings/security',
  '/admin/settings/admins',
  '/admin/settings/health',
]);

const demoLinkActions = new Map([
  ['/admin/links/new', '?/create'],
  ['/admin/links/[id]', '?/save'],
  ['/admin/links/[id]/rules', ''],
  ['/admin/links/[id]/simulate', ''],
]);

export function publicDemoHost(url: URL, mode: string | undefined): boolean {
  return mode === 'true' && url.origin === 'https://demo.linkrovia.com';
}

export function demoAdminRequest(
  route: string | null,
  method: string,
  search: string,
): 'outside' | 'hidden' | 'forbidden' | 'allow' {
  if (route !== '/admin' && !route?.startsWith('/admin/')) return 'outside';
  if (!demoPages.has(route)) return 'hidden';
  if (method === 'GET' || method === 'HEAD') return 'allow';
  if (method === 'POST' && demoLinkActions.get(route) === search)
    return 'allow';
  return 'forbidden';
}
