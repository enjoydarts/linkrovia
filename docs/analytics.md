# Analytics and conversions

Click collection starts as soon as the deployed Worker serves short links. Open **Analytics** in the admin console to see daily charts and traffic breakdowns. Open a link and choose **Link analytics** for charts and CSV downloads for that link. The charts, tables, and CSV use the selected filters. Choose dates in the effective account time zone. The default report covers the last 14 calendar days, and live click reports are limited to the most recent three months and at most 90 days per request.

The development server uses labelled sample analytics. A deployed Worker writes to its `CLICKS` Analytics Engine dataset and reads with `ANALYTICS_SQL`. Both bindings are defined in the Worker configuration. Provider errors appear as unavailable statistics. The package and application flow are tested locally. Verify that the deployed account can write and query its development dataset before relying on live reports. [Cloudflare Analytics SQL binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/analytics-sql/)

Linkrovia records successful redirect requests. It excludes HEAD requests, explicit prefetches, and the password screen. The deployed dataset records categorical device, browser, country and region information and the referrer hostname. It omits IP addresses, full user-agent strings, URL paths and queries, and conversion references. Known bot and preview clients are excluded from ordinary totals and can be inspected under **Traffic type**. Cloudflare applies sampling weights to aggregates. Nonempty production reports are marked as estimates because the binding does not return a sampling indicator. [Cloudflare datasets and sampling](https://developers.cloudflare.com/analytics/sql-api/datasets/#workers-analytics-engine-datasets)

The [scheduled Worker](deployment.md#keep-analytics-history) saves daily UTC click totals. A report that starts outside the live data window or spans more than 90 days reads saved daily totals for the full selected range, up to 366 days. In that report, missing days are marked as gaps, and a successful day with no clicks shows zero. The archive supports a single breakdown filter on its matching dimension. Domain reports group archived link totals using each link's current domain. The charts and tables show the archive uses UTC, and CSV records each missing day as a gap.

## Click reports API

Use an API key with `analytics:read`. Use `from` and `to` as inclusive `YYYY-MM-DD` dates or choose a `range` preset (`24h`, `7d`, `30d`, `90d`, or `1y`). Set `granularity` to `day`, `week`, or `month` for date ranges. Weeks begin on Monday. The year preset ends yesterday and uses monthly UTC archive buckets by default. The rolling `24h` preset uses `hour` granularity and returns UTC timestamps. Pass an IANA `tz` to query recent calendar dates or display hourly charts in that time zone. API requests default to UTC. Set `dimension` to `country`, `region`, `referrer`, `device`, `os`, `browser`, `rule`, `source`, `traffic`, or `link`. Optional `domainId`, `ruleId`, and `source=link|qr` narrow a query. To select a category, send its `filter` dimension and `key` value together. For CSV, use `bom=1` to add a UTF-8 BOM.

| Method | Endpoint                          |
| ------ | --------------------------------- |
| GET    | `/api/v1/analytics/overview`      |
| GET    | `/api/v1/links/:id/analytics`     |
| GET    | `/api/v1/links/:id/analytics.csv` |

The CSV identifies each row as `hourly`, `daily`, `weekly`, `monthly`, or `breakdown` and includes the granularity, time zone, date basis, estimate flag, and data source.

## Conversion setup

1. In **Conversions**, create a goal, such as `purchase`. Pick a link or apply the goal to all tracked links. The event identifier and link define that goal's historical identity. Create a new goal when either changes.
2. For attribution, open the link's conversion settings and enable tracking. This applies to temporary redirects. Linkrovia adds a short-lived `cl_ref` query value to the destination. Treat it as sensitive and retain it on your server. Changes to a link destination or redirect rules, and restores that overwrite a link, clear the tracking opt-in.
3. Have your server submit the event with a `conversions:write` API key. Store the key on your server. Choose a stable `Idempotency-Key` for the event and reuse it on retry. Send only the defined fields and pass `clickRef` if it is available.

```http
POST /api/v1/conversions/events
Authorization: Bearer <server-api-key>
Content-Type: application/json
Idempotency-Key: <stable-event-identifier>
```

```json
{
  "goalId": "<goal-id>",
  "occurredAt": "<UTC timestamp>",
  "clickRef": "<optional-cl_ref>"
}
```

An event without a click reference is counted as unattributed. A valid reference can be counted once for each eligible goal, and duplicate submissions with the same key return their existing receipt. An invalid, expired, or already attributed reference is rejected. The report shows received events by event date and conversion rate by recorded click cohort. The rate appears after that cohort's attribution windows close. Goal listing and conversion reports use `analytics:read`. Goal creation, update, and archive use `conversions:manage`.

| Method        | Endpoint                        |
| ------------- | ------------------------------- |
| GET, POST     | `/api/v1/conversion-goals`      |
| PATCH, DELETE | `/api/v1/conversion-goals/:id`  |
| GET           | `/api/v1/conversions/analytics` |

The conversion report accepts `from`, `to`, and `tz` for a range of up to 30 calendar days. The scheduled Worker retains receipts for at least 30 days to deduplicate retries, then stores daily event and click-cohort totals in UTC in D1. Older reports use UTC dates. Where the selected local dates clip an already archived UTC day, the report excludes that day and marks `partialUtcDays` for the affected goals. The response includes its `dateBasis`.
