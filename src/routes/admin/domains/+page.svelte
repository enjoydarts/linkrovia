<script lang="ts">
  import { linkExtra, linkMessages } from '$lib/i18n/links';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(linkMessages(data.locale));
  let x = $derived(linkExtra(data.locale));
</script>

<svelte:head><title>{m.domains} · Linkrovia</title></svelte:head>
<div class="max-w-3xl space-y-8">
  <header class="space-y-3">
    <h1 class="text-3xl font-semibold tracking-tight">{m.domains}</h1>
    <p>{m.domainHelp}</p>
    <a
      href="/admin/links"
      class="inline-block text-blue-700 underline dark:text-blue-400"
    >
      ← {m.back}
    </a>
  </header>
  <ul
    class="divide-y divide-neutral-300 rounded-lg border border-neutral-300 dark:divide-neutral-700 dark:border-neutral-700"
  >
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
          class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
        />
      </div>
      {#if form?.code}<p role="alert" class="text-red-700 dark:text-red-400">
          {m.error}
        </p>{/if}<button
        type="submit"
        class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
      >
        {m.addDomain}
      </button>
    </form>
  </section>
</div>
