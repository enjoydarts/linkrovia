# Connect a short-link domain

Choose your management hostname during initial setup, before creating the owner passkey. The hostname you choose is the address of your admin dashboard. You can connect a custom domain or continue on the original `workers.dev` address. To connect a custom domain, use an active Cloudflare-managed DNS zone in the same account as the Worker.

After setup, use **Domains → Add a domain** to add hostnames for short URLs, such as `go.example.org`.

1. Create a Cloudflare API token with **Account → Workers Scripts → Edit**, **Zone → Zone → Read**, **Zone → DNS → Read**, and **Zone → Workers Routes → Edit**. Limit the policy to the matching account and zone. Open the connection screen in Linkrovia and paste the token. Linkrovia uses the token for the request and discards it afterward. [Create an API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) · [Worker role permissions](https://developers.cloudflare.com/workers/authorization/workers/)
2. Review the hostname and confirm **Assign domain**. You can run the read-only check first. Linkrovia finds the account and zone, checks for conflicting records or routes, then asks Cloudflare to assign the domain and provision DNS and HTTPS. [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
3. Wait for the hostname to become active. Linkrovia checks public DNS and verifies that HTTPS reaches this installation. If the certificate is still being prepared, use **Check connection** again after a short wait. An active hostname can serve short links.

Keep existing MX and TXT records for the hostname. An A, AAAA, or CNAME record on the exact hostname can block assignment. Address records on other hostnames in the zone can stay in place.

If another provider manages your DNS, you can keep using your `workers.dev` hostname or move DNS management for the zone to Cloudflare. Cloudflare provisions the records for Custom Domains, so keep the hostname clear of a CNAME to `workers.dev`. Confirm the implications for any existing services before moving DNS. [Move an existing domain to Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)

The connection screen also provides manual instructions. Use them for a domain you already assigned in Cloudflare. Linkrovia can verify an existing assignment to its Worker.

If you originally set up your account on `workers.dev`, the owner can open the connection screen for a verified custom domain and choose **Enable management access**. Only one custom domain can have management access at a time. Sign in from that domain to use your existing passkey on the original sign-in host, then return to the custom domain dashboard. Keep the original sign-in host reachable for this flow.

When restoring a portable configuration to another installation, choose that installation's management hostname during setup and review management access separately. A configuration backup restores short-link settings, while the installation controls its own sign-in hosts and passkeys.

To pause a connected domain, choose **Disconnect** in Linkrovia. To remove an assignment created by Linkrovia, choose **Remove DNS assignment** and enter a scoped token again. Linkrovia preserves the saved links and settings. For an assignment created in the Cloudflare dashboard, release the hostname from your Worker's **Domains & Routes** settings.
