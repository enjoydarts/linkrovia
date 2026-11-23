# Deploying Linkrovia

Linkrovia runs on one Cloudflare Worker with a D1 database. The same Worker serves the app and runs the scheduled analytics jobs. A complete installation through the Deploy to Cloudflare button on a new Workers Free account is pending verification.

If Cloudflare reports `10089` during deployment, open [Workers Analytics Engine](https://dash.cloudflare.com/?to=/:account/workers/analytics-engine), enable it for the account, and retry the build. The retry skips D1 migrations that already ran. Linkrovia records clicks as soon as the Worker serves short links, and [Cloudflare creates the dataset on its first write](https://developers.cloudflare.com/analytics/analytics-engine/get-started/).

## Install with Deploy to Cloudflare

1. Open [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fenjoydarts%2Flinkrovia), sign in to Cloudflare, and connect GitHub when prompted.
2. Choose the names for your repository, Worker, and new D1 database. When prompted for `SETUP_TOKEN`, generate and save a private random value of at least 32 characters. Keep `npm run build` and `npm run deploy` as the build and deploy commands.
3. After the deployment succeeds, open the Worker URL and go to `/setup`. Enter your setup token, choose the address of your admin dashboard, and register your owner passkey there. To use your own hostname, follow the on-screen connection steps. The deployed Worker serves the app and runs the scheduled jobs.

[How Cloudflare provisions resources for the deploy button](https://developers.cloudflare.com/workers/platform/deploy-buttons/)

## Install with Workers Builds

1. Create a GitHub copy of [Linkrovia](https://github.com/enjoydarts/linkrovia) that you can manage. Your copy will be connected to Cloudflare for deployments and will receive your installation's Worker and database settings.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Storage & databases → D1 SQL Database**, create a database for this installation, and copy its name and database ID. In your GitHub copy, use **Edit** on `wrangler.jsonc`. In the `d1_databases` entry, keep the binding named `DB`, set `database_name` to your database name, and add `"database_id": "YOUR-DATABASE-ID"` using the ID you copied. Keep the `migrations_dir` setting. Save the change to your deployment branch. [D1 setup](https://developers.cloudflare.com/d1/get-started/)
3. In Cloudflare, open **Workers & Pages → Create application → Import a repository** and connect your GitHub copy. Choose the same Worker name as `name` in `wrangler.jsonc` and select the deployment branch. Set **Build command** to `npm run build` and **Deploy command** to `npm run deploy`, with the repository root as the root directory. Configure the account's build API token with access to deploy the Worker and edit its D1 database. Leave automatic builds for non-production branches disabled unless you create a separate Worker and D1 database for testing. [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
4. Deploy and wait for a successful build. Workers Builds reads the Node.js version from `.node-version` and the npm version from `package.json`. If the build log shows the wrong version, check that the build is running from the repository root and that its Node.js override, if any, agrees with `.node-version`. If the log says the database ID is missing, check the saved `DB` entry. If it reports a D1 permission error, check the build API token's account and D1 permissions before retrying. The deploy command checks the built package, applies pending migrations to `DB`, then uploads the Worker. [Workers Builds image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
5. In your Worker's **Settings → Variables and Secrets**, add a **Secret** named `SETUP_TOKEN`. Use your password manager to generate and save a fresh private random value of at least 32 characters. Deploy the secret and keep it available for setup. The Worker requires this secret to start owner registration. [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
6. Open your Worker's `workers.dev` address from **Workers & Pages**. Check that `/health` returns `{"status":"ok"}`, then open `/setup` and enter your setup token. Choose your admin dashboard address before creating the owner passkey. After you confirm that you can sign in, remove `SETUP_TOKEN` from **Variables and Secrets**. If setup asks you to configure the Worker, check the health result and confirm the secret is present on the deployed Worker. If you lost the token before completing setup, replace it with a newly generated one and deploy the change.

The [Deploy to Cloudflare flow](https://developers.cloudflare.com/workers/platform/deploy-buttons/) can create the D1 database and request the setup secret for public templates. Linkrovia's deploy command applies the migrations before deploying the Worker. Complete the on-screen setup, then verify that clicks appear in Analytics.

## Keep analytics history

Under **Settings → Triggers** on the application Worker, confirm the single Cron Trigger `15,45 * * * *`. It runs daily aggregation at 03:15 UTC and reconciles recent days one at a time at minute 45 of each hour. The other minute-15 invocations skip processing. The jobs store click and conversion history in the application's D1 database. Check run outcomes in **Observability**. [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

If Cloudflare reports `10072`, the account has reached its Cron Trigger limit. Linkrovia needs one slot. Check the trigger list for a retired rollup Worker before retrying. [Workers account limits](https://developers.cloudflare.com/workers/platform/limits/#account-plan-limits)

## Use and verify your deployment

- **Short links.** From the admin interface, create a link on a connected hostname and open it in a separate tab. To add another hostname for short links, follow the [domain connection guide](domains.md).
- **Analytics.** The Worker writes click events through `CLICKS` and reads reports through `ANALYTICS_SQL`. After following a test link, check its report in Linkrovia. Review the build logs and Worker bindings if reports are unavailable. Cloudflare publishes separate Free usage allowances for writes and queries. [Analytics Engine pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/) · [Analytics SQL binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/analytics-sql/)
- **Turnstile.** To enable it, create a Turnstile widget for your hostnames, add its private `TURNSTILE_SECRET_KEY` as a Worker secret, and enter the public site key under **Settings → Security** in Linkrovia. Enable protection after the screen confirms the configuration is ready. Keep the old configuration active until you have registered the new hostname or completed a key rotation. [Turnstile setup](https://developers.cloudflare.com/turnstile/get-started/)
- **Workers Free.** Owner setup uses passkeys. Existing password accounts and password-protected links use scrypt, which can exceed the Free CPU limit. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

## Command-line deployment

For an existing Cloudflare Worker and D1 database, set the Worker name and database ID in `wrangler.jsonc` as above. From the repository root, install dependencies with the pinned versions in the [development guide](development.md), authenticate Wrangler to the installation's Cloudflare account, and run:

```sh
npm run build
npm run deploy -- --dry-run
npm run deploy
```

The dry run packages the Worker and skips D1 migrations. A real deploy requires an explicit database ID, and it stops before uploading the Worker if a migration fails. Use the dashboard for the owner setup secret and follow the browser setup steps above.
