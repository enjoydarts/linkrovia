import {
  diagnoseCustomDomain,
  parseCloudflareInput,
} from '$lib/server/domains/cloudflare';
import {
  domainHostname,
  managementHostname,
} from '$lib/server/domains/connection';
import { isObject } from '$lib/server/links/api-input';
import { payload, problem } from '../../http';
import { withDomainOwner } from '../owner';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (event) =>
  withDomainOwner(event, async (db, _session, body) => {
    if (!isObject(body))
      return problem(
        400,
        'invalid_input',
        'Provide a hostname and Cloudflare access details.',
      );
    const hostname = domainHostname(body.hostname);
    const credentials = parseCloudflareInput({
      accountId: body.accountId,
      zoneId: body.zoneId,
      token: body.token,
    });
    if (!hostname || !credentials)
      return problem(
        400,
        'invalid_input',
        'Check the hostname, account, zone and API token.',
      );
    const primary = await managementHostname(db);
    const result = primary
      ? await diagnoseCustomDomain(credentials, hostname, primary)
      : { code: 'unsupported' };
    return payload(result);
  });
