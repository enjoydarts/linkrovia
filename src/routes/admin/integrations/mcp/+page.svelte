<script lang="ts">
  import { brand } from '$lib/brand';
  import type { PageProps } from './$types';
  import { mcpMessages } from './messages';

  let { data }: PageProps = $props();
  let copy = $derived(mcpMessages[data.locale]);
  let codex = $derived(`[mcp_servers.linkrovia]
url = "${data.endpoint}"
bearer_token_env_var = "LINKROVIA_MCP_TOKEN"`);
  let claude = $derived(
    JSON.stringify(
      {
        mcpServers: {
          linkrovia: {
            type: 'http',
            url: data.endpoint,
            headers: { Authorization: 'Bearer ${LINKROVIA_MCP_TOKEN}' },
          },
        },
      },
      null,
      2,
    ),
  );
</script>

<svelte:head><title>MCP · {brand.name}</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-semibold">MCP</h1>
  <form method="POST">
    <input type="hidden" name="csrfToken" value={data.csrfToken} />
    <input type="hidden" name="enabled" value={String(!data.enabled)} />
    <button
      type="submit"
      class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary"
    >
      {data.enabled ? copy.disable : copy.enable}
    </button>
  </form>
  <label class="grid gap-2">
    <span class="font-semibold">{copy.endpoint}</span>
    <input
      readonly
      value={data.endpoint}
      class="rounded-md border border-line px-3 py-2"
    />
  </label>
  <div class="space-y-3">
    <p>{copy.connect}</p>
    <a class="font-medium text-primary underline" href="/admin/api-keys">
      {copy.keys}
    </a>
    <p>{copy.client}</p>
    <p>{copy.secret}</p>
  </div>
  <ul class="grid gap-2">
    {#each data.tools as [name, scope] (name)}
      <li>
        <code>{name}</code> <span class="text-muted"><code>{scope}</code></span>
      </li>
    {/each}
  </ul>
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">Codex <code>config.toml</code></h2>
    <pre class="overflow-x-auto rounded border p-4"><code>{codex}</code></pre>
  </div>
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">Claude Code <code>.mcp.json</code></h2>
    <pre class="overflow-x-auto rounded border p-4"><code>{claude}</code></pre>
  </div>
</div>
