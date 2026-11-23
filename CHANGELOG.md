# Changelog

Notable changes to Linkrovia are recorded here. The project is in development; entries describe repository features and preview paths, not a completed production release.

## Unreleased

- Added link-list sorting by creation date in either direction and by most recently updated, with stable pagination that preserves filters.
- Added a per-link redirect-rule simulator for sample visitor context. Simulation does not redirect a visitor or record a click.
- Added a comparison with the preceding 14 days and breakdowns by country or region, referrer, operating system, and applied rule to the dashboard.
- Added per-link reporting for shared conversion goals and localized admin CSV column headers.
- Added owner-managed administrator invitations with one-time passkey registration, invitation revocation, and administrator deactivation.
- Added owner-requested recovery for missing daily click history while source events remain available, alongside scheduled rollups and reconciliation.
- Added operational and translation-maintenance guides.
- Documented the Cloudflare Deploy to Cloudflare preview path. Account provisioning and production provider checks remain subject to the verification status in the [deployment guide](docs/deployment.md).
- Documented the scoped, stateless Streamable HTTP MCP endpoint and its bearer-key requirements.
