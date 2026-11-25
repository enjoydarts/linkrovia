<script lang="ts">
  import { type Locale, uiMessages } from '$lib/i18n/locale';

  let {
    locale,
    usage,
  }: {
    locale: Locale;
    usage: {
      monthCalls: number;
      monthCostMicrousd: number;
      monthlyBudgetMicrousd: number;
      maxRunCostMicrousd: number;
    };
  } = $props();
  let m = $derived(uiMessages(locale).aiInsights);
  let number = $derived(new Intl.NumberFormat(locale));
  let money = $derived(
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }),
  );
</script>

<div class="ai-usage" aria-label={m.usage}>
  <p><strong>{m.usage}</strong></p>
  <p>
    {m.calls}: {number.format(usage.monthCalls)} · {m.budget}: {money.format(
      usage.monthCostMicrousd / 1_000_000,
    )} / {money.format(usage.monthlyBudgetMicrousd / 1_000_000)}
  </p>
  <p>{m.maxCost}: {money.format(usage.maxRunCostMicrousd / 1_000_000)}</p>
</div>

<style>
  .ai-usage {
    display: grid;
    gap: 0.4rem;
    border-left: 3px solid var(--ui-primary);
    padding: 0.65rem 1rem;
    background: var(--ui-accent-surface);
  }
  p {
    margin: 0;
  }
</style>
