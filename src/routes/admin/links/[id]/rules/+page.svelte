<script lang="ts">
  import { brand } from '$lib/brand';
  import RuleEditor from './RuleEditor.svelte';
  import { ruleMessages } from './messages';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(ruleMessages(data.locale));
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>

<div class="admin-section-stack">
  <div class="space-y-2 text-sm text-muted">
    <p>{m.help}</p>
    <p>{m.visitorHelp}</p>
  </div>
  {#if form?.saved}
    <p role="status" class="text-sm text-positive">{m.saved}</p>
  {/if}

  {#if data.demoGuest}
    {#if data.rules.length}
      {#each data.rules as rule, index (rule.id)}
        <section class="context-panel">
          <h2>
            {m.rule.replace('{position}', String(index + 1))} · {rule.active
              ? m.enabled
              : m.disabled}
          </h2>
          <p>{m.destination}: {rule.destinationUrl}</p>
          <ul>
            {#each rule.conditions as condition}<li>
                {m[condition.type]}: {condition.value}
              </li>{/each}
          </ul>
        </section>
      {/each}
    {:else}<p>{m.empty}</p>{/if}
  {:else}
    {#key `${data.linkId}:${data.updatedAt}`}
      <RuleEditor {data} {form} />
    {/key}
  {/if}
</div>
