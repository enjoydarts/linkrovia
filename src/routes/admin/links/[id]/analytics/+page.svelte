<script lang="ts">
  import Analytics from '$lib/components/analytics/Analytics.svelte';
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import { brand } from '$lib/brand';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{analyticsMessages(data.locale).linkTitle} · {brand.name}</title>
</svelte:head>
<Analytics
  locale={data.locale}
  report={data.report}
  failed={data.failed}
  filters={data.filters}
  base={`/admin/links/${data.linkId}/analytics`}
  linkScoped
/>
