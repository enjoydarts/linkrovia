# Development

## Requirements

- Node.js 26.13.1
- npm 12.2.3

The repository pins the required versions in `.node-version` and `package.json`. If your Node.js installation bundled an earlier npm release, install the pinned version with `npm install --global npm@12.2.3`.

## Local setup

Use these commands from the repository root to prepare local development.

```sh
npm ci
cp -n .dev.vars.example .dev.vars
npm run db:migrate:local
npm run db:seed:local
```

Before starting the server, set a private setup token of at least 32 characters as `SETUP_TOKEN` in `.dev.vars`. The example file shows a command for generating one. Run `npm run dev`, open <http://localhost:5173/setup>, and follow the prompts to create the owner account. Use that same hostname for subsequent administration. Local passkey registration uses `localhost`; older password accounts can continue signing in with their passwords.

The development server is available at <http://localhost:5173>. Its health endpoint is <http://localhost:5173/health> and returns `{"status":"ok"}` when the local D1 database is ready.

The local seed command creates a disabled synthetic user for development fixtures. It does not create an enabled account. The seed preserves the initial owner setup state. The browser test runner initializes an isolated D1 database with a fixed test token and removes it when the test server exits.

`.dev.vars` is for local values only and is ignored by Git. Do not put credentials in source files. The development configuration uses local D1 and an emulated authentication rate limiter. Remote bindings are disabled.

To reset local D1, stop the development server and move `.wrangler/state/` to a backup location. Run the local migration and seed commands again to recreate the development database.

Install Chromium before running browser tests for the first time.

```sh
npx playwright install chromium
```

On Linux, use `npx playwright install --with-deps chromium` if the host also needs the browser's system dependencies.

## Commands

| Command                    | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `npm run dev`              | Start the local development server.                                |
| `npm run check`            | Generate Cloudflare bindings and run Svelte and TypeScript checks. |
| `npm run lint`             | Check formatting with Prettier.                                    |
| `npm test`                 | Run unit and local workerd/D1 integration tests.                   |
| `npm run build`            | Build the application for Cloudflare Workers.                      |
| `npm run test:e2e`         | Run browser tests against a local server and D1 database.          |
| `npm run db:migrate:local` | Apply migrations to the local D1 database.                         |
| `npm run db:seed:local`    | Add disabled synthetic development fixtures.                       |

The timezone list is generated from IANA tzdata. To update it, extract a tzdata release and pass the directory containing its `version` and `zone.tab` files to the generator.

```sh
npm run timezone:generate -- /path/to/extracted/tzdata
```

The committed timezone data currently records IANA tzdata version `2026f`.

## Continuous integration

GitHub Actions runs on pushes to `main` and pull requests. It uses read-only repository permissions and no project credentials. The workflow installs dependencies with `npm ci`, then runs `check`, `lint`, unit and local workerd/D1 integration tests, and `build`. It installs Chromium with its system dependencies and runs the end-to-end browser tests. These checks use local resources and do not deploy the application.

## Link options and CSV import

Open a link in the admin interface to generate its QR code or set its protection mode. A QR code encodes a separate URL on the link's configured hostname. The QR and short URLs share the same redirect rules, active window, and redemption state.

Protected links use temporary redirects (302 or 307). Visitors confirm at the gate before a one-time link can be redeemed. A successful redemption grants one redirect. The destination can fail to load after the redirect. HEAD requests and admin previews leave the link available. For password modes, a password must contain 12 to 128 characters. Changes to the link invalidate previous unlocks.

For automation, call `POST /api/v1/links/:id/qr` with the `links:write` scope to create a default QR code. Download it from `GET /api/v1/links/:id/qr.svg` or `GET /api/v1/links/:id/qr.png` with `links:read`. To change protection, call `PUT /api/v1/links/:id/protection` with `links:write` and a JSON body containing the current `updatedAt`, a `mode` of `none`, `password`, `one_time`, or `password_one_time`, and a password if setting or replacing one.

The CSV import screen accepts UTF-8 files up to 1 MiB and 500 data rows. Include a `destination_url` column. Optional columns include `slug`, `domain`, `title`, `redirect_type`, `starts_at`, `expires_at`, `is_active`, `tags`, `ios_url`, `android_url`, and `rules`. The screen shows validation results before importing and lets you download row errors. Existing short URLs are preserved.

The `links:write` API endpoints `POST /api/v1/links/import/validate` and `POST /api/v1/links/import` accept `text/csv` and optional `duplicate` (`skip` or `error`) and `tz` query parameters. The default time zone is UTC. Preview up to 50 rows and commit up to four rows per request. For a complete file, use the zero-based `offset` and the returned `nextOffset`. A preview returns `headers` and a `record` per ready row with its assigned slug. Use those records, or CSV with explicit slugs, to commit and retry safely. When previewing multiple batches, clients can check for repeated domain and slug pairs across batches. The server checks conflicts again when committing.

## Cloudflare runtime verification

Local tests cover owner setup, passkey registration and sign-in, session revocation, D1 persistence, CSV import, QR generation, and concurrent one-time link redemption. New production setups use passkeys. Existing password accounts and password-protected links use scrypt. Password setup or verification can exceed the [Workers Free CPU limit](https://developers.cloudflare.com/workers/platform/limits/) and may require Workers Paid. The browser-led deployment path, production Turnstile validation, and execution time still require verification on Cloudflare Workers Free.
