# Connect a short-link domain

After setting up your owner account, open **Domains → Add a domain** and enter the hostname you want in your short URLs, such as `go.example.org`. Use the original `workers.dev` address to sign in to the management interface. Automatic assignment needs an active Cloudflare-managed DNS zone in the same account as the Worker.

1. Create a Cloudflare API token with **Account → Workers Scripts → Edit**, **Zone → Zone → Read**, **Zone → DNS → Read**, and **Zone → Workers Routes → Edit**. Limit the policy to the matching account and zone. Open the connection screen in Linkrovia and paste the token. Linkrovia uses the token for the request and discards it afterward. [Create an API token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) · [Worker role permissions](https://developers.cloudflare.com/workers/authorization/workers/)
2. Review the hostname and confirm **Assign domain**. You can run the read-only check first. Linkrovia finds the account and zone, checks for conflicting records or routes, then asks Cloudflare to assign the domain and provision DNS and HTTPS. [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
3. Wait for the hostname to become active. Linkrovia checks public DNS and verifies that HTTPS reaches this installation. If the certificate is still being prepared, use **Check connection** again after a short wait. An active hostname can serve short links.

If another provider manages your DNS, you can keep using your `workers.dev` hostname or move DNS management for the zone to Cloudflare. Cloudflare provisions the records for Custom Domains, so keep the hostname clear of a CNAME to `workers.dev`. Confirm the implications for any existing services before moving DNS. [Move an existing domain to Cloudflare](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)

The connection screen also provides manual instructions. Use them for a domain you already assigned in Cloudflare. Linkrovia can verify an existing assignment to its Worker.

To pause a connected domain, choose **Disconnect** in Linkrovia. To remove an assignment created by Linkrovia, choose **Remove DNS assignment** and enter a scoped token again. Linkrovia preserves the saved links and settings. For an assignment created in the Cloudflare dashboard, release the hostname from your Worker's **Domains & Routes** settings.
