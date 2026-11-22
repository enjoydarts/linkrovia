# Connect a short-link domain

After setting up your owner account, open **Domains → Add a domain** and enter the hostname you want in your short URLs, such as `go.example.org`. Keep signing in at the original deployment hostname.

1. Open your Worker in **Cloudflare Dashboard → Workers & Pages**. Under **Settings → Domains & Routes**, add a **Custom Domain** for the hostname. Use an unused hostname in an active Cloudflare zone in the same account as the Worker. If Cloudflare reports an existing DNS record or route, review it before making changes. [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
2. Cloudflare provisions the DNS record and HTTPS certificate. Return to Linkrovia and choose **Check connection**. The check requires public DNS, an HTTPS response from this installation, and an exact hostname match. When the domain is active, it can serve short links. If the check fails while Cloudflare is still provisioning the hostname, wait and try again.
3. Create a link on the connected hostname and open the resulting URL in a separate browser tab to confirm it redirects.

If another provider manages your DNS, you can keep using your `workers.dev` hostname or move DNS management for the zone to Cloudflare. Cloudflare provisions the records for Custom Domains, so keep the hostname clear of a CNAME to `workers.dev`. Confirm the implications for any existing services before moving DNS. [Move an existing domain to Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)

An optional diagnostic in the connection page checks the Cloudflare account, zone, existing DNS records, and Worker routes. Use a Cloudflare API token scoped to the account and zone with **Workers Scripts Read**, **Workers Routes Read**, and **DNS Read**. Linkrovia uses it once for the check. [Create an API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)

To pause a connected domain, choose **Disconnect** in Linkrovia. Its links and settings stay in the database. To release the hostname in Cloudflare, remove the matching Custom Domain from your Worker's settings. You can reconnect it using the same steps later.
