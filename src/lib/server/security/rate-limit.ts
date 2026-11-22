import type { RequestEvent } from '@sveltejs/kit';

export async function allowAuthAttempt(
  event: RequestEvent,
  action: string,
): Promise<boolean> {
  const limiter = event.locals.env.AUTH_LIMIT;
  if (!limiter) throw new Error('Authentication rate limiter unavailable');

  let address = 'unknown';
  try {
    address = event.getClientAddress();
  } catch {
    // The adapter may omit a client address for local or internal requests.
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(address),
  );
  const subject = Buffer.from(digest).toString('hex');
  const { success } = await limiter.limit({
    key: `linkrovia:${event.url.hostname}:${action}:${subject}`,
  });
  return success;
}
