<script lang="ts">
  import type { PageProps } from './$types';
  import { qrMessages } from './messages';
  let { data }: PageProps = $props();
  let m = $derived(qrMessages(data.locale));
  let base = $derived(`/admin/links/${encodeURIComponent(data.link.id)}/qr`);
</script>

<svelte:head><title>{m.title} · Linkrovia</title></svelte:head>
<div class="mx-auto max-w-4xl space-y-6">
  <a
    href={`/admin/links/${encodeURIComponent(data.link.id)}`}
    class="text-sm font-medium text-blue-700 hover:underline"
  >
    ← {m.back}
  </a>
  <header class="space-y-2">
    <h1 class="text-3xl font-semibold tracking-tight">{m.title}</h1>
    <p class="text-[color:var(--muted)]">{m.description}</p>
    <p class="font-medium">{data.link.title || data.link.slug}</p>
  </header>
  <section
    class="rounded-xl border border-[color:var(--line)] bg-[var(--surface)] p-6"
  >
    {#if data.url}
      <div class="flex flex-wrap items-start gap-8">
        <div class="rounded-lg bg-white p-3 shadow-sm">
          <img
            src={`${base}/image/svg`}
            alt={m.preview}
            width="280"
            height="280"
            class="h-auto w-64 max-w-full"
          />
        </div>
        <div class="min-w-0 flex-1 space-y-5">
          <div>
            <h2 class="text-sm font-medium">{m.url}</h2>
            <p class="mt-1 break-all text-sm text-[color:var(--muted)]">
              {data.url}
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a
              href={`${base}/image/svg`}
              download
              class="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white"
            >
              {m.downloadSvg}
            </a>
            <a
              href={`${base}/image/png`}
              download
              class="rounded-md border border-[color:var(--line)] px-4 py-2 text-sm font-medium"
            >
              {m.downloadPng}
            </a>
          </div>
        </div>
      </div>
    {:else}
      <form method="POST" action="?/create">
        <input type="hidden" name="csrfToken" value={data.csrfToken} />
        <button
          class="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white"
        >
          {m.create}
        </button>
      </form>
    {/if}
  </section>
</div>
