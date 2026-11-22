# Model Context Protocol

The Linkrovia MCP server lets a compatible client work with links and view click analytics over Streamable HTTP. An owner enables it under **MCP** in the admin console. The page displays the endpoint on the deployment's management hostname.

1. In **API keys**, create a separate key for the client. Select `mcp:connect` and the specific permissions the client needs. Start with `links:read` for links and `analytics:read` for reports. Add `links:write` only if the client will create or edit links or UTM templates.
2. In the client, enter the endpoint ending in `/mcp` and configure it to use the key in the `Authorization: Bearer` header. Store the key in the client's credential store or an environment variable referenced by its configuration.
3. Connect and list the tools available to that key. Revoke the key in **API keys** to disconnect one client, or disable MCP to disconnect all clients.

The endpoint accepts stateless Streamable HTTP with a bearer credential on every request. Use a client that supports a manually configured bearer token. Clients that require OAuth discovery cannot connect. [Model Context Protocol transport specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)

| Scope            | Tools                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| `links:read`     | `list_links`, `get_link`, `simulate_redirect`, `list_domains`, `list_utm_templates` |
| `analytics:read` | `get_link_analytics`                                                                |
| `links:write`    | `create_link`, `update_link`, `disable_link`, `create_utm_template`                 |

The tools use the same link validation and permissions as the REST API. `update_link` and `disable_link` require the current `updatedAt` value. DNS changes, backup restores, and one-time redemptions stay outside MCP. The admin audit records the key ID and tool name for tool calls.
