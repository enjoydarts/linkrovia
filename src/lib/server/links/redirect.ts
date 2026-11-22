import { isValidSlug } from '../security/slug';
import {
  getVisitorContext,
  selectDestination,
  type TargetingRule,
  type VisitorCloudflareMetadata,
} from '../targeting';
import { applyUtmConfig } from '../utm';
import type { RedirectType } from './store';

type RedirectLink = {
  id: string;
  destinationUrl: string;
  redirectType: RedirectType;
  startsAt: number | null;
  expiresAt: number | null;
  protectionMode: string;
  rulesJson: string;
  utmConfigJson: string | null;
};

export type ShortLinkResponse =
  | { status: 404 | 410 }
  | {
      status: RedirectType;
      location: string;
      linkId: string;
      matchedRuleId: string | null;
    };

export async function resolveShortLink(
  db: D1Database,
  hostname: string,
  slug: string,
  request: Request,
  cf?: VisitorCloudflareMetadata,
): Promise<ShortLinkResponse> {
  if (!isValidSlug(slug)) return { status: 404 };
  const link = await db
    .prepare(
      `SELECT l.id, l.destination_url AS destinationUrl, l.redirect_type AS redirectType,
            l.starts_at AS startsAt, l.expires_at AS expiresAt, l.protection_mode AS protectionMode, l.utm_config_json AS utmConfigJson,
            (SELECT json_group_array(json_object(
              'id', r.id, 'priority', r.priority, 'isActive', r.is_active,
              'conditionsJson', r.conditions_json, 'ruleType', r.rule_type,
              'operator', r.operator, 'ruleValue', r.rule_value, 'destinationUrl', r.destination_url
            )) FROM redirect_rules r WHERE r.link_id = l.id AND r.is_active = 1) AS rulesJson
     FROM domains d JOIN links l ON l.domain_id = d.id
     WHERE d.hostname = ? AND d.is_active = 1 AND d.connection_status = 'active'
       AND l.slug = ? AND l.is_active = 1 AND l.deleted_at IS NULL`,
    )
    .bind(hostname, slug)
    .first<RedirectLink>();
  if (!link || link.protectionMode !== 'none') return { status: 404 };

  const now = Date.now() / 1000;
  if (link.startsAt !== null && now < link.startsAt) return { status: 404 };
  if (link.expiresAt !== null && now >= link.expiresAt) return { status: 410 };

  const rules: TargetingRule[] = JSON.parse(link.rulesJson);
  const destination = selectDestination(
    link,
    rules,
    getVisitorContext(request, cf),
  );
  if (!destination) return { status: 404 };
  return {
    status: link.redirectType,
    location: applyUtmConfig(
      destination.url,
      link.utmConfigJson,
      destination.matchedRuleId,
    ).href,
    linkId: link.id,
    matchedRuleId: destination.matchedRuleId,
  };
}
