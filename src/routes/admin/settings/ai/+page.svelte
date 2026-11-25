<script lang="ts">
  import { enhance } from '$app/forms';
  import { brand } from '$lib/brand';
  import AiCostChart from '$lib/components/ai/AiCostChart.svelte';
  import { uiMessages } from '$lib/i18n/locale';
  import '../../admin-context.css';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(uiMessages(data.locale).aiInsights);
  let enabled = $derived(data.assistance.enabled);
  let budgetUsd = $derived<number | undefined>(
    data.assistance.monthlyBudgetMicrousd / 1_000_000,
  );
  let saving = $state(false);
</script>

<svelte:head><title>{m.settings} · {brand.name}</title></svelte:head>

<div class="admin-page">
  <header class="context-header">
    <h1>{m.settings}</h1>
    <p class="text-muted">{m.settingsIntro}</p>
  </header>

  {#if data.assistance.statusAvailable}
    <AiCostChart
      locale={data.locale}
      history={data.costHistory}
      usage={data.assistance}
    />
  {/if}

  {#if data.assistance.statusAvailable}
    <section
      class="context-panel admin-section-stack"
      aria-label={m.modelTitle}
    >
      <h2>{m.modelTitle}</h2>
      <p>
        <strong>{m.modelLabel}:</strong> <code>{data.assistance.model}</code>
      </p>
      <p>
        <strong>{m.neuronsToday}:</strong>
        {new Intl.NumberFormat(data.locale).format(data.assistance.dayNeurons)}
      </p>
      <p class="text-muted">{m.neuronsHelp}</p>
    </section>
  {/if}
  <section class="context-panel admin-section-stack" aria-label={m.settings}>
    {#if !data.assistance.statusAvailable}
      <p role="status">{m.statusUnavailable}</p>
    {:else}
      {#if !data.assistance.providerAvailable}
        <div class="grid gap-1">
          <p><strong>{m.providerUnavailable}</strong></p>
          <p class="text-muted">{m.providerHelp}</p>
          <a
            class="text-link underline"
            href="https://developers.cloudflare.com/workers-ai/configuration/bindings/"
          >
            {m.docs}
          </a>
        </div>
      {/if}
      {#if !data.assistance.priceVerified}<p role="status">
          {m.results.pricing_expired}
        </p>{/if}
      {#if data.assistance.blocked}<p role="status">{m.results.blocked}</p>{/if}
      {#if data.user.role === 'owner'}
        <form
          method="POST"
          class="grid justify-items-start gap-3"
          use:enhance={() => {
            saving = true;
            return async ({ result, update }) => {
              try {
                const stale =
                  result.type === 'failure' &&
                  result.data?.code === 'settings_changed';
                await update({
                  reset: false,
                  refreshAll: result.type === 'success' || stale,
                });
              } finally {
                saving = false;
              }
            };
          }}
        >
          <input type="hidden" name="csrfToken" value={data.csrfToken} />
          <input
            type="hidden"
            name="revision"
            value={data.assistance.revision}
          />
          <label class="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              name="enabled"
              value="yes"
              autocomplete="off"
              bind:checked={enabled}
            />
            {m.enable}
          </label>
          <div class="grid gap-1">
            <label class="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                name="weeklyEnabled"
                value="yes"
                checked={data.weeklyEnabled}
              />
              {m.weeklyEnable}
            </label>
            <p class="text-sm text-muted">{m.weeklyHelp}</p>
          </div>
          <label class="grid gap-1">
            {m.budgetLabel}
            <input
              class="admin-control"
              type="number"
              name="monthlyBudget"
              min="0"
              max={data.maxBudgetUsd}
              step="0.01"
              bind:value={budgetUsd}
              required
              aria-describedby="ai-budget-help"
            />
          </label>
          <p id="ai-budget-help" class="text-sm text-muted">{m.budgetHelp}</p>
          <button
            type="submit"
            class="admin-button admin-button-primary"
            disabled={saving}
          >
            {saving ? m.saving : m.save}
          </button>
        </form>
        {#if form}<p role={form.code === 'saved' ? 'status' : 'alert'}>
            {m.results[form.code]}
          </p>{/if}
      {:else}
        <p>
          <strong>{data.assistance.enabled ? m.enabled : m.disabled}</strong>
        </p>
        <p class="text-muted">{m.settingsHelp}</p>
      {/if}
    {/if}
  </section>
</div>
