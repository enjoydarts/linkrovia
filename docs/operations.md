# Operations

This guide describes the current self-hosted Worker. Linkrovia is still in development; a successful local build or preview deployment does not establish that every Cloudflare account can complete setup. See the [deployment guide](deployment.md) for the current deployment paths and verification notes.

## Check the installation

- Open `/health` on the same hostname as the deployed Worker. `{"status":"ok"}` confirms the application can reach its D1 database. It does not check Analytics Engine, DNS, TLS, or destination URLs.
- Sign in to the admin console and open **Analytics**. Successful short-link redirects can continue when analytics writes fail, so verify that reports are available before relying on them. An unavailable report indicates a query or binding problem; an empty report can also mean that there were no recorded clicks.
- Check the Worker's **Observability** view in Cloudflare for scheduled invocation failures. The configured Cron Trigger is `15,45 * * * *`: daily aggregation runs at 03:15 UTC and the minute-45 invocations reconcile recent days and process recovery requests.
- Open a short link on its configured hostname to check its redirect separately. Linkrovia does not currently provide automated destination health checks.

The production Worker writes click events to the configured `CLICKS` Analytics Engine dataset and reads live reports through `ANALYTICS_SQL`. Confirm both bindings if analytics is unavailable. Cloudflare can report sampled aggregates; Linkrovia marks nonempty production reports as estimates. See [Analytics and conversions](analytics.md) for data windows, fields, and archive behavior.

## Invite another administrator

Sign in as the owner and go to **Settings → Administrators**. Enter the administrator's email address and copy the invitation link when it appears. Share it privately with that person. It works once and expires after 24 hours. The recipient opens it on the management hostname and registers a passkey using the invited address.

You can revoke a pending invitation or disable an administrator from the same page. Disabling an administrator also revokes their active sessions and API keys.

## Recover missing click history

The owner can request a completed UTC day from **Analytics → Restore missing click history**. The panel lists known gaps in the still-retained live data window and shows the latest request state. A saved day with zero clicks is complete and does not need repair.

Only one missing day may be requested per 24 hours. The scheduled Worker processes at most one click repair per hourly run, prioritizes repairs over automatic reconciliation, and retries an unsuccessful request up to three total attempts while the source events remain available. Refresh Analytics to see updated state. A gap that is older than Analytics Engine's retention cannot be reconstructed by this feature and remains visible in archived reports.

## Protect and restore data

Use **Backup** to export a portable configuration before a risky change or migration. The file contains destination URLs, which may include sensitive query values; store it privately. It does not contain accounts, sessions, API keys, secrets, or analytics. Follow [Backup and restore](backup.md) for preview, merge, replace, and restore details.

For full database recovery, use Cloudflare D1 Time Travel or a private SQL export. Those methods include authentication records, so restrict access to the export and verify the recovered database before switching traffic. A configuration backup is not a substitute for D1 recovery.

Before deploying an update, review the [upgrade guide](upgrading.md), retain a recovery point, deploy, then check `/health`, owner sign-in, an existing short link, and Analytics if enabled. The deployment guide's [preview installation steps](deployment.md#install-with-deploy-to-cloudflare) are not a claim that every provider setup has passed production verification.

## MCP access

MCP uses stateless Streamable HTTP. Every request carries a bearer API key; grant only the `mcp:connect` and tool scopes the client needs. Revoke the client's key under **API keys** to disconnect it, or disable MCP to disconnect all clients. See [Connect an MCP client](mcp.md) for supported tools and configuration.
