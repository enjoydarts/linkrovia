<script lang="ts">
  import { preferenceMessages } from '$lib/i18n/preferences';
  import { brand } from '$lib/brand';
  import '../admin-context.css';
  import { domainMessages } from './messages';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(domainMessages(data.locale));
</script>

<svelte:head><title>{m.domains} · {brand.name}</title></svelte:head>
<div class="space-y-7">
  <header class="context-header">
    <a
      href="/admin/settings"
      class="inline-block text-sm font-medium text-link hover:underline"
    >
      <span aria-hidden="true">←</span>
      {preferenceMessages(data.locale).settings}
    </a>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1>{m.domains}</h1>
        <p>{m.listHelp}</p>
      </div>
      {#if data.isOwner}
        <a href="#add-domain" class="admin-button admin-button-primary">
          {m.addDomain}
        </a>
      {/if}
    </div>
  </header>
  <div
    class="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
  >
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
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <span class="rounded-md bg-surface-muted px-2.5 py-1">
              {m.connection}: {m.statuses[domain.connectionStatus] ??
                domain.connectionStatus}
            </span>
            {#if data.isOwner && domain.hostname !== data.managementHostname}<a
                class="admin-button"
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
        <h2 id="add-domain" class="scroll-mt-24 text-xl font-semibold">
          {m.addDomain}
        </h2>
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
              class="admin-control w-full"
            />
          </div>
          {#if form?.code}<p role="alert" class="text-negative">
              {m.errors[form.code] ?? m.error}
            </p>{/if}
          <button type="submit" class="admin-button admin-button-primary">
            {m.addDomain}
          </button>
        </form>
      </section>
    {:else}<p class="rounded-md border border-line p-4 text-sm" role="note">
        {m.readOnly}
      </p>{/if}
  </div>
</div>
