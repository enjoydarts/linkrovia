<picture>
  <source media="(prefers-color-scheme: dark)" srcset="static/brand/logo-dark.svg" />
  <source media="(prefers-color-scheme: light)" srcset="static/brand/logo-light.svg" />
  <img src="static/brand/logo-light.svg" width="370" height="76" alt="Linkrovia" />
</picture>

# Linkrovia

Linkrovia is an open-source, self-hosted URL shortener and analytics project for Cloudflare Workers. The project website is [linkrovia.com](https://linkrovia.com).

Short links use a hostname configured by the operator, such as a Workers hostname or a custom domain.

The local development build includes guided owner setup with passkeys, a six-language admin interface, link and domain management, QR code downloads, protected and one-time links, CSV import, scoped API keys, host-based redirects, and UTM templates. Linkrovia is in development. The development guide lists the current Cloudflare verification status.

## Brand assets

The distributable logo, mark, favicon, app icons, and OGP image are in [`static/brand/`](static/brand/). Usage guidance and the palette are documented in [`docs/BRAND.md`](docs/BRAND.md).

Self-hosted installations may personalize the app name, logo, favicon, and primary color from same-origin source configuration. Keep those values local to the installation and do not make a deployment depend on the Linkrovia website.

## Development

See [the development guide](docs/development.md) for prerequisites, local setup, and tests.

## License

Linkrovia is released under the [MIT License](LICENSE).
