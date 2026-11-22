import { error, fail, redirect } from '@sveltejs/kit';
import { parseAnalyticsQuery } from '$lib/server/analytics/report';
import { conversionSummary } from '$lib/server/conversions/events';
import {
  archiveGoal,
  getLinkTracking,
  listGoals,
  parseGoal,
  saveGoal,
  setLinkTracking,
} from '$lib/server/conversions/goals';
import { getDb } from '$lib/server/db/client';
import { getEffectiveTimeZone } from '$lib/server/db/preferences';
import { requireForm, requireSession } from '$lib/server/links/form';
import { listLinks } from '$lib/server/links/store';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => {
  const { db, session } = requireSession(event);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const linkId = event.url.searchParams.get('linkId');
  const timezone = await getEffectiveTimeZone(getDb(db), session.user.timezone);
  const { from, to, query } = parseAnalyticsQuery(
    new URLSearchParams(),
    timezone,
  );
  const [goals, { links }, tracking, summary] = await Promise.all([
    listGoals(db),
    listLinks(db, { limit: 60 }),
    linkId ? getLinkTracking(db, linkId) : null,
    conversionSummary(db, query.from, query.to),
  ]);
  const linkChoices = links.map(
    ({ id, title, slug, hostname, redirectType }) => ({
      id,
      title,
      slug,
      hostname,
      redirectType,
    }),
  );
  const targets = new Set([linkId, ...goals.map((goal) => goal.linkId)]);
  targets.delete(null);
  for (const link of linkChoices) targets.delete(link.id);
  if (targets.size) {
    const extra = await db
      .prepare(
        `SELECT l.id, l.title, l.slug, d.hostname, l.redirect_type AS redirectType
      FROM links l JOIN domains d ON d.id = l.domain_id
      WHERE l.deleted_at IS NULL AND l.id IN (SELECT value FROM json_each(?))`,
      )
      .bind(JSON.stringify([...targets]))
      .all<(typeof linkChoices)[number]>();
    linkChoices.push(...extra.results);
  }
  return {
    isOwner: session.user.role === 'owner',
    goals,
    links: linkChoices,
    tracking,
    summary,
    from,
    to,
    saved: event.url.searchParams.get('saved'),
  };
};

async function ownerForm(event: RequestEvent) {
  const current = await requireForm(event);
  if (current.session.user.role !== 'owner') error(403, 'Forbidden');
  return current;
}

function goalValues(form: URLSearchParams) {
  return parseGoal({
    name: form.get('name'),
    eventName: form.get('eventName'),
    linkId: form.get('linkId') || null,
    attributionWindowHours: Number(form.get('window')),
    isActive: form.get('active') === '1',
  });
}

function success(name: string, linkId?: string) {
  const query = new URLSearchParams({ saved: name });
  if (linkId) query.set('linkId', linkId);
  redirect(303, `/admin/conversions?${query}`);
}

export const actions: Actions = {
  create: async (event) => {
    const { db, form } = await ownerForm(event);
    const input = goalValues(form);
    if (!input || !(await saveGoal(db, input)))
      return fail(400, { code: 'invalid_goal' });
    success('created', input.linkId ?? undefined);
  },
  update: async (event) => {
    const { db, form } = await ownerForm(event);
    const input = goalValues(form);
    const id = form.get('goalId');
    if (!input || !id || !(await saveGoal(db, input, id)))
      return fail(400, { code: 'invalid_goal' });
    success('updated', input.linkId ?? undefined);
  },
  archive: async (event) => {
    const { db, form } = await ownerForm(event);
    const id = form.get('goalId');
    if (!id || !(await archiveGoal(db, id)))
      return fail(400, { code: 'invalid_goal' });
    success('removed');
  },
  tracking: async (event) => {
    const { db, form } = await ownerForm(event);
    const id = form.get('linkId');
    if (!id || !(await setLinkTracking(db, id, form.get('enabled') === '1')))
      return fail(400, { code: 'invalid_tracking' });
    success('changed', id);
  },
};
