<script lang="ts">
  import { brand } from '$lib/brand';
  import { linkExtra, linkMessages } from '$lib/i18n/links';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(linkMessages(data.locale));
  let x = $derived(linkExtra(data.locale));
</script>

<svelte:head><title>{m.domains} · {brand.name}</title></svelte:head>
<div class="max-w-3xl space-y-8">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold tracking-tight">{m.domains}</h1>
    <p>{m.domainHelp}</p>
    <a href="/admin/links" class="inline-block text-link underline">
      ← {m.back}
    </a>
  </header>
  <ul class="divide-y divide-line rounded-lg border border-line">
    {#each data.domains as domain (domain.id)}<li
        class="flex flex-wrap items-center justify-between gap-2 p-4"
      >
        <span class="break-all font-medium">{domain.hostname}</span><span
          class="text-sm"
        >
          {m.connection}: {domain.connectionStatus === 'draft'
            ? m.draft
            : domain.connectionStatus}
        </span>
      </li>{/each}
  </ul>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">{m.addDomain}</h2>
    <form method="POST" class="space-y-4">
      <input type="hidden" name="csrfToken" value={data.csrfToken} />
      <div class="space-y-2">
        <label for="hostname" class="block font-medium">
          {m.hostname}
        </label><input
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
          {m.error}
        </p>{/if}<button
        type="submit"
        class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
      >
        {m.addDomain}
      </button>
    </form>
  </section>
</div>
