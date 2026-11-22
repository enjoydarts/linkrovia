const reservedSlugs = new Set([
  '_app',
  'admin',
  'api',
  'gate',
  'health',
  'login',
  'logout',
  'mcp',
  'q',
  'setup',
]);

// Keep a 64-character alphabet so the random bytes map without modulo bias.
const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

export function isValidSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[A-Za-z0-9_-]{3,64}$/.test(value) &&
    !reservedSlugs.has(value.toLowerCase())
  );
}

export function generateSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let slug = '';
  for (const byte of bytes) slug += alphabet[byte & 63];
  return slug;
}
