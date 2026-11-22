<script lang="ts">
  import { linkMessages } from '$lib/i18n/links';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
  let m = $derived(linkMessages(data.locale));
  function nextPage(cursor: string) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data.filters))
      if (value) params.set(key, value);
    params.set('cursor', cursor);
    return `?${params}`;
  }
</script>

<svelte:head><title>{m.links} · Linkrovia</title></svelte:head>
<div class="space-y-8">
  <header class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="text-3xl font-semibold tracking-tight">{m.links}</h1>
    <div class="flex flex-wrap gap-4">
      <a
        href="/admin/domains"
        class="rounded-md border border-neutral-400 px-4 py-2 font-medium"
      >
        {m.domains}
      </a><a
        href="/admin/links/new"
        class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
      >
        {m.create}
      </a>
    </div>
  </header>
  <form
    method="GET"
    class="grid gap-4 rounded-lg border border-neutral-300 p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-neutral-700"
  >
    <div class="space-y-1">
      <label for="q" class="block text-sm font-medium">
        {m.searchLinks}
      </label><input
        id="q"
        name="q"
        value={data.filters.q}
        class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
      />
    </div>
    <div class="space-y-1">
      <label for="domain" class="block text-sm font-medium">
        {m.domain}
      </label><select
        id="domain"
        name="domain"
        class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
      >
        <option value="">
          {m.allDomains}
        </option>{#each data.domains as domain (domain.id)}<option
            value={domain.id}
            selected={data.filters.domain === domain.id}
          >
            {domain.hostname}
          </option>{/each}
      </select>
    </div>
    <div class="space-y-1">
      <label for="tag" class="block text-sm font-medium">{m.tag}</label><input
        id="tag"
        name="tag"
        value={data.filters.tag}
        class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
      />
    </div>
    <div class="space-y-1">
      <label for="status" class="block text-sm font-medium">
        {m.status}
      </label><select
        id="status"
        name="status"
        class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
      >
        <option value="">{m.allStatuses}</option><option
          value="active"
          selected={data.filters.status === 'active'}
        >
          {m.active}
        </option><option
          value="inactive"
          selected={data.filters.status === 'inactive'}
        >
          {m.inactive}
        </option>
      </select>
    </div>
    <button
      type="submit"
      class="self-end rounded-md border border-neutral-400 px-4 py-2 font-medium"
    >
      {m.filter}
    </button>
  </form>
  {#if data.links.length === 0}<p>{m.empty}</p>{:else}<ul
      class="divide-y divide-neutral-300 rounded-lg border border-neutral-300 dark:divide-neutral-700 dark:border-neutral-700"
    >
      {#each data.links as link (link.id)}<li class="space-y-2 p-4">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <a
              href="/admin/links/{encodeURIComponent(link.id)}"
              class="font-semibold text-blue-700 underline underline-offset-4 dark:text-blue-400"
            >
              {link.title || link.shortUrl}
            </a><span class="text-sm">
              {link.isActive ? m.active : m.inactive}
            </span>
          </div>
          <p class="break-all text-sm">{m.shortUrl}: {link.shortUrl}</p>
          <p class="break-all text-sm text-neutral-600 dark:text-neutral-300">
            {m.destination}: {link.destinationUrl}
          </p>
          {#if link.startsAt !== null}<p class="text-sm">
              {m.startsAt}: {new Date(link.startsAt * 1000)
                .toISOString()
                .replace('T', ' ')
                .replace('Z', ' UTC')}
            </p>{/if}
          {#if link.expiresAt !== null}<p class="text-sm">
              {m.expiresAt}: {new Date(link.expiresAt * 1000)
                .toISOString()
                .replace('T', ' ')
                .replace('Z', ' UTC')}
            </p>{/if}
          {#if link.tags.length}<p class="text-sm">
              {m.tags}: {link.tags.join(', ')}
            </p>{/if}
        </li>{/each}
    </ul>{/if}
  {#if data.nextCursor}<a
      href={nextPage(data.nextCursor)}
      class="inline-block text-blue-700 underline dark:text-blue-400"
    >
      {m.next} →
    </a>{/if}
</div>
