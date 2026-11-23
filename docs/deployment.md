# Deploying Linkrovia

Linkrovia runs on Cloudflare Workers with a D1 database. The browser-based deployment below is a preview. The build and package have been verified locally. A complete installation on a new Workers Free account, including Analytics Engine and Analytics SQL availability, is pending verification.

If Cloudflare reports `10089` during deployment, open [Workers Analytics Engine](https://dash.cloudflare.com/?to=/:account/workers/analytics-engine), enable it for the account, and retry the build. The retry skips D1 migrations that already ran. Linkrovia records clicks as soon as the Worker serves short links, and [Cloudflare creates the dataset on its first write](https://developers.cloudflare.com/analytics/analytics-engine/get-started/).

## Install from your browser

1. Create a GitHub copy of [Linkrovia](https://github.com/enjoydarts/linkrovia) that you can manage. Your copy will be connected to Cloudflare for deployments and will receive your installation's Worker and database settings.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Storage & databases → D1 SQL Database**, create a database for this installation, and copy its name and database ID. In your GitHub copy, use **Edit** on `wrangler.jsonc`. In the `d1_databases` entry, keep the binding named `DB`, set `database_name` to your database name, and add `"database_id": "YOUR-DATABASE-ID"` using the ID you copied. Keep the `migrations_dir` setting. Save the change to your deployment branch. [D1 setup](https://developers.cloudflare.com/d1/get-started/)
3. In Cloudflare, open **Workers & Pages → Create application → Import a repository** and connect your GitHub copy. Choose the same Worker name as `name` in `wrangler.jsonc` and select the deployment branch. Set **Build command** to `npm run build` and **Deploy command** to `npm run deploy`, with the repository root as the root directory. Configure the account's build API token with access to deploy the Worker and edit its D1 database. Leave automatic builds for non-production branches disabled unless you create a separate Worker and D1 database for testing. [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
4. Deploy and wait for a successful build. Workers Builds reads the Node.js version from `.node-version` and the npm version from `package.json`. If the build log shows the wrong version, check that the build is running from the repository root and that its Node.js override, if any, agrees with `.node-version`. If the log says the database ID is missing, check the saved `DB` entry. If it reports a D1 permission error, check the build API token's account and D1 permissions before retrying. The deploy command checks the built package, applies pending migrations to `DB`, then uploads the Worker. [Workers Builds image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
5. In your Worker's **Settings → Variables and Secrets**, add a **Secret** named `SETUP_TOKEN`. Use your password manager to generate and save a fresh private random value of at least 32 characters. Deploy the secret and keep it available for setup. The Worker requires this secret to start owner registration. [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
6. Open your Worker's `workers.dev` address from **Workers & Pages**. Check that `/health` returns `{"status":"ok"}`, then open `/setup`, enter your setup token, and follow the prompts to create an owner passkey. Keep using the same management hostname to sign in. After you confirm that you can sign in, remove `SETUP_TOKEN` from **Variables and Secrets**. If setup asks you to configure the Worker, check the health result and confirm the secret is present on the deployed Worker. If you lost the token before completing setup, replace it with a newly generated one and deploy the change.

The official [Deploy to Cloudflare flow](https://developers.cloudflare.com/workers/platform/deploy-buttons/) documents D1 provisioning and secret entry for public templates. The button requires an installation test against the public Linkrovia repository before it is enabled. Cloudflare's provisioning list covers D1. Verify the analytics bindings on the deployed Worker separately. The flow deploys one Worker.

## Keep analytics history

Deploy the scheduled Worker from the same GitHub repository and branch to save click and conversion history in the main application's D1 database.

1. In **Workers & Pages → Create application → Import a repository**, select the same repository and deployment branch. Use the main Worker's name followed by `-rollup` for the scheduled Worker.
2. Use `npm run build` as the build command and `npm run deploy -- --rollup` as the deploy command. Use a build API token with permissions to deploy the scheduled Worker and edit the same D1 database. Deploy the main Worker first so the application and database bindings are ready.
3. Confirm the scheduled Worker lists the `DB` and `ANALYTICS_SQL` bindings. Check **Settings → Triggers** for a daily run at 03:15 UTC and an hourly reconciliation. The hourly run revisits recent days one at a time. The scheduled Worker needs no setup token or public URL. Check run outcomes in **Observability**. [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

## Use and verify your deployment

- **Short links.** From the admin interface, create a link on the instance's `workers.dev` hostname and open it in a separate tab. To connect a custom hostname, start in **Domains** after owner setup and follow the [domain connection guide](domains.md).
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

The dry run packages the Worker and skips D1 migrations. A real deploy requires an explicit database ID, and it stops before uploading the Worker if a migration fails. Use the dashboard for the owner setup secret and follow the browser setup steps above. After deploying the main Worker, run `npm run deploy -- --rollup --dry-run` to package the scheduled Worker and `npm run deploy -- --rollup` to deploy it.
