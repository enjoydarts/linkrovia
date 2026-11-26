# Deploying Linkrovia

Linkrovia runs on one Cloudflare Worker with a D1 database. The Worker serves the app and runs the scheduled analytics jobs. The Deploy to Cloudflare button has been verified through reaching the setup screen at the Worker's public HTTPS address. Guided custom-domain setup and owner passkey registration have also been verified on an existing Cloudflare deployment. For plan limits and costs, see [Cloudflare plans for Linkrovia](cloudflare-plans.md).

## Install with Deploy to Cloudflare

1. Open [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fenjoydarts%2Flinkrovia), sign in to Cloudflare, and connect GitHub when prompted.
2. Choose the names for your repository, Worker, and new D1 database. When prompted for `SETUP_TOKEN`, generate and save a private random password of 32–512 characters. Keep `npm run build` and `npm run deploy` as the build and deploy commands.
3. When the deployment finishes, open the published HTTPS address from **Workers & Pages**. Linkrovia takes you directly to `/setup` on the first visit. The build log also shows the setup link. Follow the [browser setup steps](#set-up-the-owner-account).

For both browser-based installation paths, the deploy command retries the upload without click analytics bindings if Cloudflare returns error `10089`. The build log reports when analytics was deferred. You can finish setup and use short links, then [enable click analytics](#enable-click-analytics) on the same Worker and database.

[How Cloudflare provisions resources for the deploy button](https://developers.cloudflare.com/workers/platform/deploy-buttons/)

### If the Worker address does not open

Linkrovia uses the Workers Builds credentials, when available, to register a `linkrovia-…` account subdomain if the account has none and to enable the new Worker's `workers.dev` route. If the build could not configure it, open **Workers & Pages** and follow the subdomain prompt. Select the Worker and check its `workers.dev` entry under **Settings → Domains & Routes**. Allow a few minutes for DNS and HTTPS, then retry the same URL. [Cloudflare workers.dev setup](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)

To retry a failed build, open the existing Worker's **Deployments → View Build History** and select **Retry build**. Check the existing Worker and database before retrying. An upload can succeed even if the build's final HTTPS check fails. [Cloudflare build troubleshooting](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/)

### GitHub authorization errors

Check that the GitHub user you signed in with has authorized the Cloudflare Workers & Pages app and that the app is installed on the account or organization that will own the copy. GitHub lists these under **Authorized GitHub Apps** and **Installed GitHub Apps**, respectively. [Cloudflare GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/#install-and-authorize-the-app)

If the error returns immediately after authorization and there is no build log, give Cloudflare the attempt time and the destination repository and Worker names so they can investigate. To continue installing with a repository you manage, follow [Install with Workers Builds](#install-with-workers-builds).

## Install with Workers Builds

1. Create a GitHub copy of [Linkrovia](https://github.com/enjoydarts/linkrovia) that you can manage. Your copy will be connected to Cloudflare for deployments and will receive your installation's Worker and database settings.
2. In the [Cloudflare dashboard](https://dash.cloudflare.com/), open **Storage & databases → D1 SQL Database**, create a database for this installation, and copy its name and database ID. In your GitHub copy, use **Edit** on `wrangler.jsonc`. In the `d1_databases` entry, keep the binding named `DB`, set `database_name` to your database name, and add `"database_id": "YOUR-DATABASE-ID"` using the ID you copied. Keep the `migrations_dir` setting. Save the change to your deployment branch. [D1 setup](https://developers.cloudflare.com/d1/get-started/)
3. In Cloudflare, open **Workers & Pages → Create application**, choose **GitHub**, and select your copy. Choose the same Worker name as `name` in `wrangler.jsonc` and select the deployment branch. Set **Build command** to `npm run build` and **Deploy command** to `npm run deploy`, with the repository root as the root directory. Use a build API token with access to deploy the Worker and edit its D1 database. If you use the default Workers Builds token, add **D1: Edit** in your Cloudflare profile before building. Leave automatic builds for non-production branches disabled unless you create a separate Worker and D1 database for testing. [Create a Worker from a repository](https://developers.cloudflare.com/workers/ci-cd/builds/) · [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
4. Deploy and wait for a successful build. Workers Builds reads the Node.js version from `.node-version` and the npm version from `package.json`. If the build log shows the wrong version, check that the build is running from the repository root and that its Node.js override, if any, agrees with `.node-version`. The deploy command checks the built package, applies pending migrations to `DB`, then uploads the Worker. [Workers Builds image](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
5. In your Worker's **Settings → Variables and Secrets**, add a **Secret** named `SETUP_TOKEN`. Use your password manager to generate and save a private random password of 32–512 characters. Deploy the secret and keep it available for setup. The Worker requires this secret to start owner registration. [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
6. Follow the [browser setup steps](#set-up-the-owner-account).

## Set up the owner account

1. Open your Worker's published HTTPS address or the setup link from the build log. Enter the `SETUP_TOKEN` you saved for this installation. If the page says the token is missing or invalid, open the same Worker's **Settings → Variables and Secrets**, add or update the **Secret**, select **Deploy**, then reload `/setup`. If the address is unavailable, follow the [Worker address steps](#if-the-worker-address-does-not-open).
2. Choose where to open your admin dashboard before registering your passkey. Select **Use this hostname** to stay on `workers.dev`. To use a custom hostname, follow the [domain connection guide](domains.md#connect-your-management-hostname-during-setup), choose **Open setup on your custom hostname**, and enter the setup token again there. Register the passkey on that address. If the page is still waiting for HTTPS, retry from the same setup screen when Cloudflare is ready.
3. Create the owner account and register a passkey on the chosen hostname. Open a fresh browser session and confirm you can sign in there. Remove `SETUP_TOKEN` from **Variables and Secrets** after setup is complete.

## Enable click analytics

1. Open [Workers Analytics Engine](https://dash.cloudflare.com/?to=/:account/workers/analytics-engine), select the Cloudflare account that hosts Linkrovia, and enable the service.
2. In the same Worker's **Deployments**, select **View Build History**, open the latest build, and select **Retry build**. Workers Builds uses the installation's existing Worker and database. [Build history and retry](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/)
3. Collection starts with the redeployed Worker. Clicks from the period when analytics was disabled are absent from reports. Follow the analytics step in the [deployment checklist](#use-and-verify-your-deployment) to confirm collection.

## Keep analytics history

Under **Settings → Triggers** on the application Worker, confirm the single Cron Trigger `15,45 * * * *`. It runs daily aggregation at 03:15 UTC and reconciles recent days one at a time at minute 45 of each hour. The optional [weekly AI report](analytics.md#weekly-reports-and-guardian) is scheduled for Mondays at 04:15 UTC. The other minute-15 invocations skip processing. The jobs store click and conversion history in the application's D1 database. Check scheduled runs under **Settings → Trigger Events → View events**. For a new Worker, past events can take up to 30 minutes to appear. [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/#view-past-events)

## Use and verify your deployment

To repeat the full check from a fresh Cloudflare account, use the deploy button with a new Worker and D1 database. If the account has no `workers.dev` subdomain, check that the deployment publishes one or follow the dashboard steps above. Start with Analytics Engine disabled if you also want to verify activation on the same installation.

1. **Setup.** Open the published HTTPS address in a browser and confirm it takes you to `/setup`. Enter the setup token, choose the management hostname, and finish [owner setup](#set-up-the-owner-account).
2. **Owner sign-in.** Sign out, open a fresh browser session on the chosen management hostname, and confirm the passkey signs you in. Remove the setup token from the Worker and confirm a fresh visit to `/setup` can no longer create an owner.
3. **Short link.** Create a link to a known HTTPS page using the hostname offered in the link editor. Open the saved short URL in a regular browser tab and confirm the address bar lands on the destination. If you connected a custom short-link hostname, create and follow a link on that hostname as well. [Connect a short-link hostname](domains.md#add-a-short-link-hostname-after-setup)
4. **Analytics.** If the build deferred analytics, [enable it and retry the build](#enable-click-analytics). On the new deployment, confirm `CLICKS` and `ANALYTICS_SQL` are present on the Worker's **Bindings** page. Open a new test short link in a regular browser tab after the deployment. Open that link's **Link analytics**, select a date range that includes the test click, and confirm the report shows at least one click. This exercises the write through `CLICKS` and the read through `ANALYTICS_SQL`. Give ingestion a moment and refresh if the report is empty. If either binding is missing, check the latest build log for deferred analytics. Cloudflare creates the dataset on the first write. [Workers Analytics Engine setup](https://developers.cloudflare.com/analytics/analytics-engine/get-started/) · [Analytics SQL binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/analytics-sql/)
5. **Schedule.** Confirm the [Cron Trigger](#keep-analytics-history) is listed on the same Worker. After a minute-45 run, check its outcome under **Settings → Trigger Events → View events**.

Turnstile is optional after owner setup. The browser challenge and server-side verification have been verified on local Workerd with Cloudflare's test keys. Verification with production keys on a deployed Worker is pending. [Enable Turnstile](operations.md#enable-turnstile) · [Cloudflare Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)

For optional AI features, use [AI settings](analytics.md#enable-ai-assistance) after owner setup. Automatic page metadata has [separate deployment requirements](analytics.md#retrieve-page-information-automatically).

## Fix a deployment problem

| What you see                                              | How to recover                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub authorization fails, or your repository is missing | Verify the GitHub account and the Cloudflare app's repository access. For an organization-owned repository, check that the organization approved the app. Follow the [GitHub authorization steps](#github-authorization-errors).                                                                                                                                                                                                         |
| The Worker uploaded, but `/setup` is unreachable          | Check the account subdomain and the Worker's `workers.dev` route, then give DNS and HTTPS time to become available. If the browser shows Cloudflare Access, sign in there first. [Worker address steps](#if-the-worker-address-does-not-open)                                                                                                                                                                                            |
| The build token is invalid or lacks permission            | In the Worker's **Settings → Build**, check that its API token is active and scoped to this account. It needs **Workers Scripts: Edit** and **D1: Edit** for deploy and migrations. Update the token and retry the build. [Workers Builds token configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token)                                                                                          |
| The build stops on D1 migrations                          | Check the `DB` binding and that its database ID matches the intended D1 database. Check the build log for the first failing migration. Correct the database configuration or token permissions and retry the same build. The deploy command uploads the Worker only after pending migrations succeed. [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)                                                        |
| Click analytics was deferred or the first report is empty | If the build logged error `10089`, enable Analytics Engine and retry the build. If both bindings are already present, open the link in a regular browser tab and check that the report covers that click’s date. [Enable analytics](#enable-click-analytics) · [Verify your deployment](#use-and-verify-your-deployment)                                                                                                                 |
| Cloudflare reports `10072` while attaching the schedule   | Linkrovia needs one Cron Trigger slot. Review the account's limits and check for a trigger on a retired rollup Worker before retrying. [Workers account limits](https://developers.cloudflare.com/workers/platform/limits/#account-plan-limits)                                                                                                                                                                                          |
| Custom hostname reports a DNS conflict or pending HTTPS   | Check that the hostname is in an active zone in the Worker's account. Pick an available hostname if there's a conflict. Cloudflare creates the DNS records and certificate for a Custom Domain. When HTTPS is ready, retry **Open setup on your custom hostname** or **Check connection**. [Connect a domain](domains.md) · [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) |
| Your passkey is unavailable on a different hostname       | Sign in on the hostname where the passkey was registered. If you enabled a custom dashboard after setup, keep the original sign-in hostname reachable so the sign-in round trip can complete. [Management access on a custom hostname](domains.md#enable-admin-access-on-an-existing-custom-hostname)                                                                                                                                    |
| Turnstile verification fails during activation            | Keep your owner session open. Check that both production keys come from the same widget and that the widget allows your sign-in hostname, then retry **Verify and enable**. Use test keys for local testing. [Turnstile activation and recovery](operations.md#enable-turnstile)                                                                                                                                                         |

## Command-line deployment

For an existing Cloudflare Worker and D1 database, set the Worker name and database ID in `wrangler.jsonc` as above. From the repository root, install dependencies with the pinned versions in the [development guide](development.md), authenticate Wrangler to the installation's Cloudflare account, and run the following commands.

```sh
npm run build
npm run deploy -- --dry-run
npm run deploy
```

The dry run packages the Worker and skips D1 migrations. A real deploy requires an explicit database ID, and it stops before uploading the Worker if a migration fails. Use the dashboard for the owner setup secret and follow the browser setup steps above.

The default configuration publishes the Worker on `workers.dev`. For an installation that exclusively uses a custom hostname, set `workers_dev` to `false` in `wrangler.jsonc` and open setup or management on that custom hostname. [Cloudflare route settings](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
