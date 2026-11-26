const demoPages = new Set([
  '/admin',
  '/admin/analytics',
  '/admin/analytics/conversions',
  '/admin/analytics/insights',
  '/admin/guardian',
  '/admin/links',
  '/admin/links/[id]',
  '/admin/links/[id]/analytics',
  '/admin/links/[id]/conversions',
  '/admin/links/[id]/rules',
  '/admin/links/[id]/simulate',
]);

export function publicDemoHost(url: URL, mode: string | undefined): boolean {
  return mode === 'true' && url.origin === 'https://demo.linkrovia.com';
}

export function demoAdminRequest(
  route: string | null,
  method: string,
  search: string,
): 'outside' | 'hidden' | 'forbidden' | 'view' {
  if (route !== '/admin' && !route?.startsWith('/admin/')) return 'outside';
  if (!demoPages.has(route)) return 'hidden';
  if (method === 'GET' || method === 'HEAD') return 'view';
  // The simulation action only performs SELECTs and evaluates the stored rules.
  if (route === '/admin/links/[id]/simulate' && method === 'POST' && !search)
    return 'view';
  return 'forbidden';
}
