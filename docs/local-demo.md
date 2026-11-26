# Local demo

Open the Linkrovia admin workspace in a controlled Chromium window with fictional links and sample click data. From the repository root, install the pinned dependencies and browser, then start the demo.

```sh
npm ci
npx playwright install chromium
npm run demo:local
```

The demo starts on loopback port 4187 and opens Chromium. Use the **Local demo** bar to move between these screens.

| Screen                 | What to try                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Links                  | Find **Spring launch** and **Product guide**, and compare them with the inactive **Retired webinar**.         |
| Redirect rules         | Review the ordered country and device rules for **Spring launch**.                                            |
| Rule simulator         | Enter `JP` as the country code to see its matching destination. Clear the visitor fields to see the fallback. |
| Analytics and Insights | Change the date range, open the sample breakdown, and compare the two completed weeks.                        |
| Guardian               | Select **Retired webinar**, then choose **Check link** to see the inactive-link result.                       |
| MCP                    | Open a client’s example to see how its configuration is organized.                                            |

Each launch creates a fresh local D1 database and a temporary browser session. Closing Chromium stops the local server and removes its temporary state. Sample clicks come from Linkrovia’s local analytics provider. The demo browser permits the listed screens, the simulator, and the inactive-link Guardian check. Save actions, API and MCP calls, and navigation to external URLs are blocked in that browser. Application requests use local bindings and the demo fixtures throughout.

Use `npm run demo:check` for the headless smoke test that CI runs. Keep the demo runner on loopback and use the browser it opens. For an internet-facing Linkrovia instance, follow the [deployment guide](deployment.md).

## Verify the hosted demo package

```sh
npm run build
npm run deploy:demo -- --dry-run
```

The hosted demo deploys the same application bundle with its own Worker, D1 database, click dataset, and authentication rate limiter. Its deployment target stays on Workers Free. Visitors who receive an administrator invitation can sign in with a passkey and work with that demo instance. The optional page metadata companion requires Workers Paid and is outside this configuration. [Cloudflare plans and costs](cloudflare-plans.md)
