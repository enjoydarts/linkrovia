<script lang="ts">
  import { messagesFor } from '$lib/i18n/locale';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  let messages = $derived(messagesFor(data.locale));
</script>

<svelte:head><title>{messages['admin.title']} · Linkrovia</title></svelte:head>
<div class="space-y-4">
  <h1 class="text-3xl font-semibold tracking-tight">
    {messages['admin.title']}
  </h1>
  <p>{messages['admin.welcome']}</p>
  <p class="text-sm text-neutral-600 dark:text-neutral-300">
    {messages['admin.account']}: {data.user.email}
  </p>
</div>
