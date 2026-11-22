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

## Cloudflare runtime verification

Local tests cover owner setup, passkey registration and sign-in, session revocation, and D1 persistence. New production setups use passkeys. Existing password accounts retain their scrypt sign-in. The browser-led deployment path, production Turnstile validation, and execution time still require verification on Cloudflare Workers Free.
