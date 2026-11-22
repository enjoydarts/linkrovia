# Analytics and conversions

Open **Analytics** in the admin console to see daily clicks and breakdowns. Open a link and choose **Link analytics** to narrow the report and download a CSV. Choose dates in the effective account time zone. The default report covers the last 14 calendar days, and live click reports are limited to the most recent three months and at most 90 days per request.

The development server uses labelled sample analytics. A deployed Worker writes to its `CLICKS` Analytics Engine dataset and reads with `ANALYTICS_SQL`. Both bindings are defined in the Worker configuration. Provider errors appear as unavailable statistics. The package and application flow are tested locally. Verify that the deployed account can write and query its development dataset before relying on live reports. [Cloudflare Analytics SQL binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/analytics-sql/)

Linkrovia records successful redirect requests. It excludes HEAD requests, explicit prefetches, and the password screen. The deployed dataset records categorical device, browser, country and region information and the referrer hostname. It omits IP addresses, full user-agent strings, URL paths and queries, and conversion references. Known bot and preview clients are excluded from ordinary totals and can be inspected under **Traffic type**. Cloudflare applies sampling weights to aggregates. Nonempty production reports are marked as estimates because the binding does not return a sampling indicator. [Cloudflare datasets and sampling](https://developers.cloudflare.com/analytics/sql-api/datasets/#workers-analytics-engine-datasets)

## Click reports API

Use an API key with `analytics:read`. Requests accept `from` and `to` as inclusive `YYYY-MM-DD` dates and an optional IANA `tz`. Set `dimension` to `country`, `region`, `referrer`, `device`, `os`, `browser`, `rule`, `source`, `traffic`, or `link`. Optional `domainId`, `ruleId`, and `source=link|qr` narrow a query. To select a category, send its `filter` dimension and `key` value together. For CSV, use `bom=1` to add a UTF-8 BOM.

| Method | Endpoint                          |
| ------ | --------------------------------- |
| GET    | `/api/v1/analytics/overview`      |
| GET    | `/api/v1/links/:id/analytics`     |
| GET    | `/api/v1/links/:id/analytics.csv` |

The CSV identifies each row as `daily` or `breakdown` and includes the time zone, date basis, estimate flag, and data source.

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

The conversion report accepts `from`, `to`, and `tz` for a range of up to 30 calendar days. The current release reads recent conversion receipts from D1. Daily rollups and scheduled cleanup of expired references and processed receipts are part of the next phase.
