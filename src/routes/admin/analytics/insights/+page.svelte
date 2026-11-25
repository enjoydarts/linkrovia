<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { brand } from '$lib/brand';
  import AiUsageSummary from '$lib/components/ai/AiUsageSummary.svelte';
  import ReportNavigation from '$lib/components/analytics/ReportNavigation.svelte';
  import { uiMessages } from '$lib/i18n/locale';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(uiMessages(data.locale).aiInsights);
  let generating = $state(false);
  let number = $derived(new Intl.NumberFormat(data.locale));
  let signal = $derived(data.insights.anomalies[0]);
  let canGenerate = $derived(
    data.assistance.statusAvailable &&
      data.assistance.dayCalls < 10 &&
      data.assistance.monthCalls < 100 &&
      data.assistance.enabled &&
      data.assistance.providerAvailable &&
      data.assistance.priceVerified &&
      !data.assistance.blocked &&
      !data.assistance.busy &&
      data.insights.status === 'ready' &&
      data.assistance.monthlyBudgetMicrousd > 0 &&
      data.assistance.monthCostMicrousd < data.assistance.monthlyBudgetMicrousd,
  );
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>
<ReportNavigation locale={data.locale} current="insights" />

<div class="insights">
  <section class="workspace-panel section" aria-labelledby="comparison-title">
    <div class="section-heading">
      <h2 id="comparison-title">{m.title}</h2>
      <p>{m.intro}</p>
    </div>
    {#if data.insights.status === 'unavailable'}
      <p role="status" class="notice">{m.unavailable}</p>
    {:else}
      <div class="periods">
        <div class="period">
          <h3>{m.current}</h3>
          <p class="dates">
            <time datetime={data.insights.periods.current.startDate}>
              {data.insights.periods.current.startDate}
            </time>
            –
            <time datetime={data.insights.periods.current.endDate}>
              {data.insights.periods.current.endDate}
            </time>
          </p>
          <p class="metric">
            {data.insights.current.visits === null
              ? '—'
              : number.format(data.insights.current.visits)}
            <span>{m.clicks}</span>
          </p>
        </div>
        <div class="period">
          <h3>{m.previous}</h3>
          <p class="dates">
            <time datetime={data.insights.periods.previous.startDate}>
              {data.insights.periods.previous.startDate}
            </time>
            –
            <time datetime={data.insights.periods.previous.endDate}>
              {data.insights.periods.previous.endDate}
            </time>
          </p>
          <p class="metric">
            {data.insights.previous.visits === null
              ? '—'
              : number.format(data.insights.previous.visits)}
            <span>{m.clicks}</span>
          </p>
        </div>
      </div>
      {#if data.insights.status === 'insufficient'}
        <p class="notice">{m.insufficient}</p>
      {:else}
        <p class="change">
          <strong>{m.change}:</strong>
          {data.insights.changePercent === null
            ? m.noChange
            : `${data.insights.changePercent > 0 ? '+' : ''}${number.format(data.insights.changePercent)}%`}
        </p>
        <p>
          {signal
            ? signal.kind === 'traffic_drop'
              ? m.signalDrop
              : m.signalSpike
            : m.noSignal}
        </p>
      {/if}
    {/if}
    {#if data.insights.warnings.length}
      <div class="notes">
        <strong>{m.warnings}</strong>
        <ul>
          {#each data.insights.warnings as warning (warning)}<li>
              {m[
                warning as
                  | 'missing_days'
                  | 'low_volume'
                  | 'estimated'
                  | 'analytics_unavailable'
              ]}
            </li>{/each}
        </ul>
      </div>
    {/if}
  </section>

  <section class="workspace-panel section" aria-labelledby="report-title">
    <div class="section-heading report-heading">
      <div>
        <h2 id="report-title">{m.aiTitle}</h2>
        <p>{m.aiIntro}</p>
      </div>
      <a class="admin-button" href="/admin/settings/ai">{m.settings}</a>
    </div>
    {#if !data.assistance.statusAvailable}
      <p role="status" class="notice">{m.statusUnavailable}</p>
    {:else}
      <p><strong>{data.assistance.enabled ? m.enabled : m.disabled}</strong></p>
      {#if !data.assistance.providerAvailable}
        <p class="notice">{m.providerUnavailable}</p>
      {/if}
      {#if !data.assistance.enabled && data.user.role !== 'owner'}<p>
          {m.askOwner}
        </p>{/if}
      {#if !data.assistance.priceVerified}
        <p class="notice">{m.results.pricing_expired}</p>
      {/if}
      {#if data.assistance.blocked}<p class="notice">
          {m.results.blocked}
        </p>{/if}
      {#if data.assistance.busy}<p class="notice">{m.results.busy}</p>{/if}
      {#if data.assistance.monthlyBudgetMicrousd === 0}<p class="notice">
          {m.budgetHelp}
        </p>{/if}
      {#if data.assistance.monthlyBudgetMicrousd > 0 && data.assistance.monthCostMicrousd >= data.assistance.monthlyBudgetMicrousd}
        <p class="notice">{m.budgetReached}</p>
      {/if}
      {#if data.assistance.dayCalls >= 10 || data.assistance.monthCalls >= 100}
        <p class="notice">{m.results.limit}</p>
      {/if}
      <AiUsageSummary locale={data.locale} usage={data.assistance} />
      <p class="muted">{m.privacy}</p>
      <form
        method="POST"
        action="?/generate"
        use:enhance={() => {
          generating = true;
          return async ({ update, result }) => {
            try {
              await update();
              if (result.type === 'failure') await invalidateAll();
            } finally {
              generating = false;
            }
          };
        }}
      >
        <input type="hidden" name="csrfToken" value={data.csrfToken} />
        <button
          class="admin-button admin-button-primary"
          disabled={!canGenerate || generating}
        >
          {generating ? m.generating : m.generate}
        </button>
      </form>
      {#if form?.operation === 'generate'}<p role="status" class="notice">
          {m.results[form.code]}
        </p>{/if}
      {#if data.assistance.report}
        <article class="report">
          <h3>{data.assistance.report.headline}</h3>
          <p>{data.assistance.report.summary}</p>
          <p class="muted">
            {m.reportCreated}:
            <time
              datetime={new Date(
                data.assistance.report.createdAt,
              ).toISOString()}
            >
              {new Intl.DateTimeFormat(data.locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(data.assistance.report.createdAt))}
            </time>
          </p>
        </article>
      {:else}<p class="muted">{m.reportEmpty}</p>{/if}
    {/if}
  </section>
</div>

<style>
  .insights {
    display: grid;
    gap: 1rem;
    min-width: 0;
  }
  .section {
    padding: 1.5rem;
  }
  .section-heading {
    margin-bottom: 1.25rem;
  }
  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.3rem;
  }
  h3 {
    font-size: 1rem;
    font-weight: 650;
    margin: 0;
  }
  p {
    margin: 0.5rem 0;
  }
  .section-heading p,
  .muted,
  .dates {
    color: var(--color-muted, #667085);
    font-size: 0.9rem;
  }
  .periods {
    display: grid;
    gap: 0.75rem;
  }
  .period {
    border: 1px solid var(--ui-border);
    border-radius: 0.6rem;
    padding: 1rem;
  }
  .metric {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 0;
  }
  .metric span {
    font-size: 0.9rem;
    font-weight: 500;
  }
  .change {
    margin-top: 1rem;
  }
  .notice,
  .notes,
  .report {
    border-left: 3px solid var(--ui-primary);
    padding: 0.65rem 1rem;
    margin: 1rem 0;
    background: var(--ui-accent-surface);
  }
  .notes ul {
    margin: 0.3rem 0 0;
    padding-left: 1.25rem;
  }
  .report-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  @media (min-width: 840px) {
    .periods {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 640px) {
    .section {
      padding: 1rem;
    }
  }
</style>
