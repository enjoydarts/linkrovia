<script lang="ts">
  import { brand } from '$lib/brand';
  import LinkForm from '$lib/components/links/LinkForm.svelte';
  import { linkMessages } from '$lib/i18n/links';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(linkMessages(data.locale));
</script>

<svelte:head><title>{m.create} · {brand.name}</title></svelte:head>
<div class="space-y-6">
  <p class="max-w-2xl text-muted">{m.destination}</p>
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
