<script lang="ts">
  import LinkForm from '$lib/components/links/LinkForm.svelte';
  import { linkExtra, linkMessages } from '$lib/i18n/links';
  import { protectionMessages } from '$lib/i18n/protection';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(linkMessages(data.locale));
  let x = $derived(linkExtra(data.locale));
  let protection = $derived(protectionMessages(data.locale));
</script>

<svelte:head><title>{m.edit} · Linkrovia</title></svelte:head>
<div class="space-y-6">
  <a href="/admin/links" class="text-blue-700 underline dark:text-blue-400">
    ← {m.back}
  </a>
  <h1 class="text-3xl font-semibold tracking-tight">{m.edit}</h1>
  {#if data.link}<p class="break-all">
      <span class="font-medium">{m.shortUrl}:</span>
      <a
        href={data.link.shortUrl}
        class="text-blue-700 underline dark:text-blue-400"
      >
        {data.link.shortUrl}
      </a>
    </p>
    <div class="flex flex-wrap gap-3">
      <a
        href={`/admin/links/${data.link.id}/qr`}
        class="rounded-md border px-3 py-2 font-medium hover:underline"
        style="border-color: var(--line)"
      >
        {protection.qr}
      </a>
      <a
        href={`/admin/links/${data.link.id}/protection`}
        class="rounded-md border px-3 py-2 font-medium hover:underline"
        style="border-color: var(--line)"
      >
        {protection.title}
      </a>
    </div>
  {/if}
  {#if form?.code === 'temporary_redirect'}
    <p role="alert" class="text-red-700 dark:text-red-400">
      {protection.temporaryRedirect}
    </p>
  {/if}
  <LinkForm
    formAction="?/save"
    locale={data.locale}
    csrfToken={data.csrfToken}
    domains={data.domains}
    link={data.link}
    timeZone={data.timeZone}
    error={form?.code === 'temporary_redirect' ? undefined : form?.code}
    values={form && 'values' in form ? form.values : undefined}
  />
  {#if data.link}
    <details class="max-w-2xl rounded-md border border-red-500 p-4">
      <summary class="cursor-pointer font-medium">{x.deleteHelp}</summary>
      <form method="POST" action="?/remove" class="mt-4 space-y-4">
        <input type="hidden" name="csrfToken" value={data.csrfToken} />
        <input
          type="hidden"
          name="updatedAt"
          value={form && 'values' in form && form.values
            ? form.values.updatedAt
            : data.link.updatedAt}
        />
        <label class="flex items-center gap-2">
          <input type="checkbox" required />{x.confirmDelete}
        </label>
        <button
          type="submit"
          class="rounded-md bg-red-700 px-4 py-2 font-medium text-white"
        >
          {m.remove}
        </button>
      </form>
    </details>
  {/if}
</div>
