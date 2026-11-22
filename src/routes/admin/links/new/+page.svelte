<script lang="ts">
  import LinkForm from '$lib/components/links/LinkForm.svelte';
  import { linkMessages } from '$lib/i18n/links';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(linkMessages(data.locale));
</script>

<svelte:head><title>{m.create} · Linkrovia</title></svelte:head>
<div class="space-y-6">
  <a href="/admin/links" class="text-blue-700 underline dark:text-blue-400">
    ← {m.back}
  </a>
  <h1 class="text-3xl font-semibold tracking-tight">{m.create}</h1>
  <LinkForm
    locale={data.locale}
    csrfToken={data.csrfToken}
    domains={data.domains}
    link={data.link}
    timeZone={data.timeZone}
    error={form?.code}
    values={form && 'values' in form ? form.values : undefined}
  />
</div>
