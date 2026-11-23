import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { requireForm, requireSession } from '$lib/server/links/form';
import { updateDomainAssignment } from '$lib/server/domains/assignment';
import { parseCloudflareInput } from '$lib/server/domains/cloudflare';
import {
  managementHostname,
  readDomainConnection,
} from '$lib/server/domains/connection';
import { allowAuthAttempt } from '$lib/server/security/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db, session } = requireSession(event);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const [domain, primary] = await Promise.all([
    readDomainConnection(db, event.params.id),
    managementHostname(db),
  ]);
  if (!domain) error(404, 'Domain not found');
  const { mappingId: _mappingId, ...view } = domain;
  return {
    locale: event.locals.locale,
    domain: view,
    managementHostname: primary ?? null,
    isOwner: session.user.role === 'owner',
  };
}) satisfies PageServerLoad;

async function assign(event: RequestEvent, operation: 'attach' | 'detach') {
  const { db, session, form } = await requireForm(event);
  if (session.user.role !== 'owner') error(403, 'Forbidden');
  const version = form.get('version');
  if (form.get('confirmed') !== 'on' || !version || !/^\d+$/.test(version))
    return fail(400, { operation, code: 'confirmation_required' });
  const credentials = parseCloudflareInput({
    accountId: form.get('accountId')?.trim(),
    zoneId: form.get('zoneId')?.trim(),
    token: form.get('token')?.trim(),
  });
  if (!credentials)
    return fail(400, { operation, code: 'invalid_credentials' });
  if (
    !(await allowAuthAttempt(event, `domain-assignment:${session.user.id}`, {
      byAddress: false,
    }))
  )
    return fail(429, { operation, code: 'busy' });

  const [domain, primary] = await Promise.all([
    readDomainConnection(db, event.params.id ?? ''),
    managementHostname(db),
  ]);
  if (!domain || domain.isPrimary) error(404, 'Domain not found');
  if (domain.version !== Number(version))
    return fail(409, { operation, code: 'domain_changed' });
  if (!primary) return fail(422, { operation, code: 'unsupported' });
  try {
    const { code } = await updateDomainAssignment(
      db,
      domain,
      session.user.id,
      operation,
      credentials,
      primary,
    );
    switch (code) {
      case 'attached':
      case 'detached':
        return { operation, code };
      case 'permissions':
        return fail(403, { operation, code });
      case 'conflict':
      case 'domain_changed':
      case 'not_managed':
        return fail(409, { operation, code });
      case 'unsupported':
        return fail(422, { operation, code });
      default:
        return fail(503, { operation, code });
    }
  } catch {
    return fail(503, { operation, code: 'provider_error' });
  }
}

export const actions = {
  attach: (event) => assign(event, 'attach'),
  detach: (event) => assign(event, 'detach'),
} satisfies Actions;
