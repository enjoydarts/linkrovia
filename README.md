<picture>
  <source media="(prefers-color-scheme: dark)" srcset="static/brand/logo-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="static/brand/logo-light.svg" />
  <img src="static/brand/logo-light.svg" width="370" height="76" alt="Linkrovia" />
</picture>

# Linkrovia

Linkrovia is an open-source, self-hosted URL shortener and analytics project for Cloudflare Workers. The project website is [linkrovia.com](https://linkrovia.com).

Short links use a hostname configured by the operator, such as a Workers hostname or a custom domain.

The local development build includes guided owner setup with passkeys, a seven-language admin interface, link and domain management, QR code downloads, protected and one-time links, CSV import, scoped API keys, host-based redirects, and UTM templates. Linkrovia is in development. The development guide lists the current Cloudflare verification status.

The interface supports English, Japanese, Simplified Chinese, Traditional Chinese, Spanish, Italian, and French. Choose a language in **Preferences** or use your browser’s language when you visit.

Edit a link's **Redirect rules** to direct visitors by device, operating system, location, or language. Use **Campaign parameters** to set UTM values for the default destination or a specific rule. Test the saved behavior in **Rule simulator**.

Owners can download, validate, and restore a configuration backup from **Backup** in the admin interface. The backup guide covers supported records, restore options, and Cloudflare D1 recovery. [Backup and restore](docs/backup.md)

Use **Analytics** for click totals, daily trends, and breakdowns, or open a link for its own report and CSV. Use **Conversions** to manage goals and connect a server-side event sender. The analytics guide explains the local sample data and Cloudflare setup. [Analytics and conversions](docs/analytics.md)

For deployment operations and recovery, see [Operations](docs/operations.md). Contributors maintaining the seven UI languages can use the [translation guide](docs/translation.md).

Owners can enable a scoped Model Context Protocol endpoint for clients that support bearer credentials. [Connect an MCP client](docs/mcp.md)

The [OpenAPI 3.1 contract](static/openapi.yaml) describes the REST API, including required scopes and error responses. Deployed instances serve it at `/openapi.yaml`.

## Deploy to Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fenjoydarts%2Flinkrovia)

Deploy to Cloudflare is available for preview installations. Follow the [deployment guide](docs/deployment.md) to register your first owner passkey and verify the deployment.

Owners can assign a hostname from an active Cloudflare-managed zone in **Domains**. Linkrovia checks for conflicts and verifies the resulting HTTPS connection. [Connect a short-link domain](docs/domains.md)

If you already run Linkrovia, see the [upgrade guide](docs/upgrading.md) before updating your installation.

## Brand assets

The distributable logo, mark, favicon, app icons, and OGP image are in [`static/brand/`](static/brand/). Usage guidance and the palette are documented in [`docs/BRAND.md`](docs/BRAND.md).

Self-hosted installations may personalize the app name, logo, favicon, and primary color from same-origin source configuration. Keep those values local to the installation and do not make a deployment depend on the Linkrovia website.

## Development

See [the development guide](docs/development.md) for prerequisites, local setup, and tests.

## License

Linkrovia is released under the [MIT License](LICENSE).
