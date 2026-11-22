# Development

## Requirements

- Node.js 24.22.3
- npm 11.19.1

The repository's `.node-version` and `package.json` record the required versions.

## Local setup

From the repository root, install dependencies and prepare the local environment:

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

The development server is available at <http://localhost:5173>. Its health endpoint is <http://localhost:5173/health> and returns `{"status":"ok"}` when the local D1 database is ready.

The local seed command creates a disabled synthetic user for development fixtures. It does not create an enabled account. When testing initial setup flows in a future phase, skip the seed command so the database remains in its uninitialized state.

`.dev.vars` is for local values only and is ignored by Git. Do not put credentials in source files. The local Wrangler configuration uses a local D1 database only; it does not connect to a remote SQL service or configure remote Analytics.

To reset local D1, stop the development server and move `.wrangler/state/` to a backup location. Run the local migration and seed commands again to recreate the development database.

Install Chromium before running browser tests for the first time:

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

The timezone list is generated from IANA tzdata. To update it, extract a tzdata release and pass the directory containing its `version` and `zone.tab` files to:

```sh
npm run timezone:generate -- /path/to/extracted/tzdata
```

The committed timezone data currently records IANA tzdata version `2026f`.

## Continuous integration

GitHub Actions runs on pushes to `main` and pull requests. It uses read-only repository permissions and no project credentials. The workflow installs dependencies with `npm ci`, then runs `check`, `lint`, unit and local workerd/D1 integration tests, and `build`. It installs Chromium with its system dependencies and runs the end-to-end browser tests. These checks use local resources and do not deploy the application.
