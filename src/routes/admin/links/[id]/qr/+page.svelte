<script lang="ts">
  import { brand } from '$lib/brand';
  import type { PageProps } from './$types';
  import { qrMessages } from './messages';
  let { data }: PageProps = $props();
  let m = $derived(qrMessages(data.locale));
  let base = $derived(`/admin/links/${encodeURIComponent(data.link.id)}/qr`);
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>
<div class="max-w-4xl space-y-6">
  <header class="space-y-2">
    <h2 class="text-xl font-semibold tracking-tight">{m.title}</h2>
    <p class="text-muted">{m.description}</p>
    <p class="font-medium">{data.link.title || data.link.slug}</p>
  </header>
  <section class="rounded-xl border border-line bg-surface p-6">
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
            <p class="mt-1 break-all text-sm text-muted">
              {data.url}
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a
              href={`${base}/image/svg`}
              download
              class="admin-button admin-button-primary"
            >
              {m.downloadSvg}
            </a>
            <a href={`${base}/image/png`} download class="admin-button">
              {m.downloadPng}
            </a>
          </div>
        </div>
      </div>
    {:else}
      <form method="POST" action="?/create">
        <input type="hidden" name="csrfToken" value={data.csrfToken} />
        <button class="admin-button admin-button-primary">
          {m.create}
        </button>
      </form>
    {/if}
  </section>
</div>
