<script lang="ts">
  import { brand } from '$lib/brand';
  import '../admin-context.css';
  import { domainMessages } from './messages';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(domainMessages(data.locale));
</script>

<svelte:head><title>{m.domains} · {brand.name}</title></svelte:head>
<div class="max-w-3xl space-y-8">
  <header class="context-header space-y-3">
    <h1 class="text-3xl font-semibold tracking-tight">{m.domains}</h1>
    <p>{m.listHelp}</p>
    <a href="/admin/links" class="inline-block text-link underline">
      ← {m.back}
    </a>
  </header>
  <ul
    class="context-panel context-list divide-y divide-line rounded-lg border border-line"
    aria-label={m.domains}
  >
    {#each data.domains as domain (domain.id)}
      <li class="flex flex-wrap items-center justify-between gap-3 p-4">
        <div class="min-w-0">
          {#if domain.hostname === data.managementHostname}
            <a
              class="break-all font-medium text-link underline"
              href={'https://' + domain.hostname}
            >
              {domain.hostname}
            </a>
          {:else}<span class="break-all font-medium">
              {domain.hostname}
            </span>{/if}
          {#if domain.hostname === data.managementHostname}<span
              class="ml-2 rounded bg-surface-muted px-2 py-1 text-xs"
            >
              {m.management}
            </span>{/if}
        </div>
        <div class="flex items-center gap-3 text-sm">
          <span>
            {m.connection}: {m.statuses[domain.connectionStatus] ??
              domain.connectionStatus}
          </span>
          {#if data.isOwner && domain.hostname !== data.managementHostname}<a
              class="text-link underline"
              href={'/admin/domains/' +
                encodeURIComponent(domain.id) +
                '/connect'}
            >
              {m.manage}
            </a>{/if}
        </div>
      </li>
    {:else}<li class="p-4">{m.none}</li>{/each}
  </ul>
  {#if data.isOwner}
    <section class="context-panel space-y-4" aria-labelledby="add-domain">
      <h2 id="add-domain" class="text-xl font-semibold">{m.addDomain}</h2>
      <p class="text-sm">{m.addHelp}</p>
      <form method="POST" class="space-y-4">
        <input type="hidden" name="csrfToken" value={data.csrfToken} />
        <div class="space-y-2">
          <label for="hostname" class="block font-medium">{m.hostname}</label>
          <input
            id="hostname"
            name="hostname"
            type="text"
            required
            autocomplete="off"
            placeholder="links.example.com"
            value={form?.hostname ?? ''}
            class="w-full rounded-md border border-control bg-surface px-3 py-2"
          />
        </div>
        {#if form?.code}<p role="alert" class="text-negative">
            {m.errors[form.code] ?? m.error}
          </p>{/if}
        <button
          type="submit"
          class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
        >
          {m.addDomain}
        </button>
      </form>
    </section>
  {:else}<p class="rounded-md border border-line p-4 text-sm" role="note">
      {m.readOnly}
    </p>{/if}
</div>
