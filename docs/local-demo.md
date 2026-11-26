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

The [hosted demo](https://demo.linkrovia.com/) uses the same application bundle with a dedicated Worker, D1 database, click dataset, and authentication rate limiter. The demo deploy command sets `LINKROVIA_DEMO_MODE` for that hostname. Visitors can browse the read-only demo and run the redirect simulator. Demo administrators sign in with a passkey to make changes.

The sample workspace contains 180 example links and 72 redirect rules. Short URLs lead to public documentation, while dashboard and sample-link click reports and the seeded conversion history use simulated activity. Link analytics for links created by administrators use the configured click dataset. The optional page information service is separate from the demo profile. [Cloudflare plans and costs](cloudflare-plans.md)

Generate an import for the hosted demo with `node scripts/demo-sample-data.mjs demo.linkrovia.com`. Run it against the dedicated demo database after the owner finishes setup. The import preserves existing rows and leaves owner and authentication settings alone.
