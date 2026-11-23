<script lang="ts">
  import { brand } from '$lib/brand';
  import RuleEditor from './RuleEditor.svelte';
  import { ruleMessages } from './messages';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(ruleMessages(data.locale));
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>

<div class="max-w-4xl space-y-5">
  <div class="space-y-2 text-sm text-muted">
    <p>{m.help}</p>
    <p>{m.visitorHelp}</p>
  </div>
  <dl class="rounded-lg border border-line bg-surface p-4 text-sm">
    <dt class="font-medium">{m.defaultDestination}</dt>
    <dd class="mt-1 break-all text-muted">
      <code>{data.destinationUrl}</code>
    </dd>
  </dl>
  {#if form?.saved}
    <p role="status" class="text-sm text-positive">{m.saved}</p>
  {/if}

  {#key `${data.linkId}:${data.updatedAt}`}
    <RuleEditor {data} {form} />
  {/key}
</div>
