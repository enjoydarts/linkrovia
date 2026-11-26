import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const demoHostname = 'demo.linkrovia.com';
const publicPages = [
  'https://developers.cloudflare.com/workers/',
  'https://developers.cloudflare.com/workers/get-started/guide/',
  'https://developers.cloudflare.com/workers/wrangler/',
  'https://developers.cloudflare.com/workers/configuration/routing/custom-domains/',
  'https://developers.cloudflare.com/d1/',
  'https://developers.cloudflare.com/d1/get-started/',
  'https://developers.cloudflare.com/workers-ai/',
  'https://developers.cloudflare.com/analytics/analytics-engine/',
  'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections',
  'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-Language',
  'https://developer.mozilla.org/en-US/docs/Web/API/URL',
  'https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams',
  'https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API',
  'https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides',
  'https://developer.mozilla.org/en-US/docs/Web/Privacy',
  'https://docs.github.com/en/get-started',
  'https://docs.github.com/en/repositories',
  'https://docs.github.com/en/actions',
  'https://docs.github.com/en/pages',
  'https://docs.github.com/en/discussions',
  'https://docs.github.com/en/issues',
  'https://docs.github.com/en/communities',
  'https://www.w3.org/WAI/fundamentals/accessibility-intro/',
  'https://www.w3.org/WAI/perspective-videos/',
];
const japanesePages = [
  'https://developer.mozilla.org/ja/docs/Web/HTTP/Guides/Redirections',
  'https://developer.mozilla.org/ja/docs/Web/API/URL',
  'https://developer.mozilla.org/ja/docs/Web/API/Web_Authentication_API',
];
const mobilePages = [
  'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design',
  'https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images',
  'https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using',
];
const categories = [
  ['Aurora', 'Campaigns'],
  ['Field Notes', 'Documentation'],
  ['Studio North', 'Events'],
  ['Harbor', 'Education'],
  ['Maple', 'Partners'],
  ['Trailhead', 'Community'],
  ['Juniper', 'Product'],
  ['Paper Plane', 'Newsletters'],
  ['Beacon', 'Research'],
  ['Orchard', 'Resources'],
  ['Cedar', 'Onboarding'],
  ['Waypoint', 'Support'],
];
const activities = [
  ['Launch', 'launch', 'Main announcement and product overview.'],
  [
    'Quick-start guide',
    'quick-start',
    'First steps and a short setup checklist.',
  ],
  [
    'Workshop registration',
    'workshop',
    'Sign-up page for the next live session.',
  ],
  ['Release notes', 'releases', 'Release highlights and a list of changes.'],
  [
    'Customer stories',
    'stories',
    'Examples collected from the project community.',
  ],
  [
    'Resource library',
    'library',
    'Templates, reading lists, and reference material.',
  ],
  [
    'Newsletter',
    'newsletter',
    'The current issue and newsletter subscription form.',
  ],
  ['Feedback form', 'feedback', 'Short survey about the latest update.'],
  [
    'Event schedule',
    'schedule',
    'Session times, speakers, and attendance details.',
  ],
  [
    'Getting help',
    'help',
    'Answers to common questions and support resources.',
  ],
  [
    'Partner briefing',
    'briefing',
    'Project updates prepared for partner teams.',
  ],
  ['Replay', 'replay', 'Recording and slides from the previous session.'],
  [
    'Join the community',
    'community',
    'Community information and registration page.',
  ],
  ['Download kit', 'download', 'Download page for the project media kit.'],
  [
    'Archive',
    'archive',
    'Retained for internal reference after the campaign ended.',
  ],
];

const channels = [
  ['newsletter', 'email'],
  ['community', 'social'],
  ['partner', 'referral'],
  ['event', 'qr'],
];

const tagNames = [
  'Demo sample',
  ...categories.map(([, name]) => name),
  'Evergreen',
  'Seasonal',
  'Localized',
].map((name, index) => ({ id: `demo-sample-tag-${index + 1}`, name }));

const tracking = (
  /** @type {string} */ source,
  /** @type {string} */ medium,
  /** @type {string} */ campaign,
) => ({
  utm_source: source,
  utm_medium: medium,
  utm_campaign: campaign,
});

export const demoSampleLinks = activities.flatMap(
  ([activity, suffix, description], activityIndex) =>
    categories.map(([project, category], categoryIndex) => {
      const index = activityIndex * categories.length + categoryIndex;
      const number = String(index + 1).padStart(3, '0');
      const key = project.toLowerCase().replaceAll(' ', '-');
      const slug = `${key}-${suffix}`;
      const [source, medium] =
        channels[(activityIndex + categoryIndex) % channels.length];
      const states = {
        paused: activityIndex === 14,
        expired: activityIndex === 11 && categoryIndex % 2 === 0,
        planned: activityIndex === 8 && categoryIndex % 2 === 0,
      };
      const localized = activityIndex < 3;
      const createdDaysAgo = activityIndex * 6 + (categoryIndex % 6) + 1;
      return {
        id: `demo-sample-link-${number}`,
        slug,
        title: `${project} · ${activity}`,
        description,
        destinationUrl:
          publicPages[(categoryIndex * 7 + activityIndex) % publicPages.length],
        redirectType:
          activityIndex === 3
            ? 308
            : activityIndex === 5
              ? 301
              : activityIndex === 8
                ? 307
                : 302,
        isActive: states.paused ? 0 : 1,
        startsInDays: states.planned ? 4 + categoryIndex : null,
        expiresInDays: states.planned
          ? 18 + categoryIndex
          : states.expired
            ? -5 - categoryIndex
            : null,
        utmConfig:
          index % 3 !== 2 ? { default: tracking(source, medium, slug) } : null,
        createdDaysAgo,
        tags: [
          'Demo sample',
          category,
          activityIndex % 2 === 0 ? 'Seasonal' : 'Evergreen',
          ...(localized ? ['Localized'] : []),
        ],
        rules: localized
          ? [
              {
                id: `demo-sample-rule-${number}-ja`,
                conditions: [
                  { type: 'country', operator: 'eq', value: 'JP' },
                  { type: 'language', operator: 'base_language', value: 'ja' },
                ],
                destinationUrl: japanesePages[activityIndex],
                priority: 1,
              },
              {
                id: `demo-sample-rule-${number}-mobile`,
                conditions: [
                  { type: 'device', operator: 'eq', value: 'mobile' },
                ],
                destinationUrl: mobilePages[activityIndex],
                priority: 2,
              },
            ]
          : [],
        goal:
          activityIndex === 2 || activityIndex === 6
            ? {
                id: `demo-sample-goal-${number}`,
                name: `${project} · ${activityIndex === 2 ? 'Workshop sign-up' : 'Newsletter subscription'} (Demo sample)`,
                event:
                  activityIndex === 2
                    ? 'demo_workshop_signup'
                    : 'demo_newsletter_signup',
                window: activityIndex === 2 ? 72 : 24,
              }
            : null,
      };
    }),
);

/** @param {unknown} value */
function jsonSql(value) {
  return `json_each('${JSON.stringify(value).replaceAll("'", "''")}')`;
}

const activeDomain = `SELECT id FROM domains
WHERE hostname = '${demoHostname}' AND is_active = 1 AND backup_archived_at IS NULL`;
const insertedLink = `JOIN links AS link ON link.id = sample.value ->> '$.id' AND link.domain_id = domain.id
  AND link.slug = sample.value ->> '$.slug' AND link.destination_url = sample.value ->> '$.destinationUrl'
  AND link.deleted_at IS NULL`;
const day = "unixepoch('now', 'start of day')";

/** @param {string} hostname */
export function demoSampleSql(hostname) {
  if (hostname !== demoHostname)
    throw new Error(
      `Supply exactly ${demoHostname} to generate the demo sample SQL.`,
    );

  const templates = channels.map(([source, medium], index) => ({
    id: `demo-sample-utm-${index + 1}`,
    name: `Demo sample · ${source}`,
    values: tracking(source, medium, 'demo-campaign'),
  }));
  const statements = [
    `
INSERT INTO tags (id, name)
SELECT value ->> '$.id', value ->> '$.name'
FROM (${activeDomain}), ${jsonSql(tagNames)}
WHERE true ON CONFLICT DO NOTHING;

INSERT INTO utm_templates (id, name, values_json)
SELECT value ->> '$.id', value ->> '$.name', value -> '$.values'
FROM (${activeDomain}), ${jsonSql(templates)}
WHERE true ON CONFLICT DO NOTHING;
`,
  ];

  // Each batch keeps the JSON embedded in a D1 statement comfortably below its size limit.
  for (let offset = 0; offset < demoSampleLinks.length; offset += 30) {
    const batch = demoSampleLinks.slice(offset, offset + 30);
    const demoRows = `(${activeDomain}) AS domain CROSS JOIN ${jsonSql(batch)} AS sample`;
    statements.push(`
INSERT INTO links (
  id, domain_id, slug, destination_url, title, description, redirect_type, is_active,
  starts_at, expires_at, utm_config_json, conversion_tracking, created_at, updated_at
)
SELECT value ->> '$.id', domain.id, value ->> '$.slug', value ->> '$.destinationUrl',
  value ->> '$.title', value ->> '$.description', value ->> '$.redirectType', value ->> '$.isActive',
  ${day} + (value ->> '$.startsInDays') * 86400, ${day} + (value ->> '$.expiresInDays') * 86400,
  CASE WHEN value ->> '$.utmConfig' IS NOT NULL THEN value -> '$.utmConfig' END,
  (value ->> '$.goal') IS NOT NULL,
  ${day} - (value ->> '$.createdDaysAgo') * 86400, ${day} - (value ->> '$.createdDaysAgo') * 86400
FROM ${demoRows}
WHERE true ON CONFLICT DO NOTHING;

INSERT INTO link_tags (link_id, tag_id)
SELECT link.id, tag.id
FROM ${demoRows}
${insertedLink}
JOIN json_each(sample.value, '$.tags') AS sample_tag
JOIN ${jsonSql(tagNames)} AS expected_tag ON expected_tag.value ->> '$.name' = sample_tag.value
JOIN tags AS tag ON tag.id = expected_tag.value ->> '$.id' AND tag.name = sample_tag.value
WHERE true ON CONFLICT DO NOTHING;

INSERT INTO redirect_rules (
  id, link_id, rule_type, operator, rule_value, conditions_json, destination_url, priority, created_at, updated_at
)
SELECT rule.value ->> '$.id', link.id, rule.value ->> '$.conditions[0].type',
  rule.value ->> '$.conditions[0].operator', rule.value ->> '$.conditions[0].value',
  rule.value -> '$.conditions', rule.value ->> '$.destinationUrl', rule.value ->> '$.priority',
  link.created_at, link.created_at
FROM ${demoRows}
${insertedLink}
JOIN json_each(sample.value, '$.rules') AS rule
WHERE true ON CONFLICT DO NOTHING;

INSERT INTO conversion_goals (id, name, link_id, event_name, attribution_window_hours, created_at)
SELECT sample.value ->> '$.goal.id', sample.value ->> '$.goal.name', link.id, sample.value ->> '$.goal.event',
  sample.value ->> '$.goal.window', link.created_at
FROM ${demoRows}
${insertedLink}
WHERE sample.value ->> '$.goal.id' IS NOT NULL AND link.conversion_tracking = 1
ON CONFLICT DO NOTHING;
`);
    const sampleGoals = batch.filter((link) => link.goal);
    if (sampleGoals.length) {
      // Use the persisted creation date so reruns keep the same history days.
      const history = `
WITH offsets(days_ago) AS (VALUES (2), (4), (6), (8), (10), (12)),
history AS (
  SELECT date(link.created_at, 'unixepoch',
      printf('%+d days', (sample.value ->> '$.createdDaysAgo') - days_ago)) AS day_utc,
    goal.id AS goal_id, link.id AS link_id,
    2 + (CAST(substr(link.id, -3) AS INTEGER) + days_ago) % 11 AS attributed,
    1 + (CAST(substr(link.id, -3) AS INTEGER) + days_ago) % 4 AS unattributed,
    30 + (CAST(substr(link.id, -3) AS INTEGER) * 7 + days_ago * 11) % 115 AS eligible
  FROM (${activeDomain}) AS domain CROSS JOIN ${jsonSql(sampleGoals)} AS sample
  ${insertedLink}
  JOIN conversion_goals AS goal ON goal.id = sample.value ->> '$.goal.id'
    AND goal.link_id = link.id AND goal.event_name = sample.value ->> '$.goal.event'
  CROSS JOIN offsets
  WHERE goal.backup_archived_at IS NULL
)
`;
      statements.push(`
${history}
INSERT INTO conversion_rollups (day_utc, goal_id, link_id, conversions, attributed)
SELECT day_utc, goal_id, link_id, attributed + unattributed, attributed FROM history
WHERE day_utc < date('now') ON CONFLICT DO NOTHING;

${history}
INSERT INTO conversion_cohort_rollups (day_utc, goal_id, eligible_clicks, converted_clicks)
SELECT day_utc, goal_id, eligible, attributed FROM history
WHERE day_utc < date('now') ON CONFLICT DO NOTHING;
`);
    }
  }
  return statements.join('');
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 3 || process.argv[2] !== demoHostname) {
    console.error(
      `Usage: node scripts/demo-sample-data.mjs ${demoHostname} > demo-sample.sql`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(demoSampleSql(process.argv[2]));
  }
}
