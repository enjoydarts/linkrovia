<script lang="ts">
  import type { Chart as ChartInstance } from 'chart.js';
  import { type Locale, uiMessages } from '$lib/i18n/locale';

  let {
    locale,
    history,
    usage,
  }: {
    locale: Locale;
    history: null | {
      days: {
        date: string;
        settledMicrousd: number;
        pendingMicrousd: number;
        calls: number;
      }[];
      settledMicrousd: number;
      pendingMicrousd: number;
    };
    usage: {
      monthCalls: number;
      monthCostMicrousd: number;
      monthlyBudgetMicrousd: number;
    };
  } = $props();
  let m = $derived(uiMessages(locale).aiInsights);
  let money = $derived(
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }),
  );
  let number = $derived(new Intl.NumberFormat(locale));
  let days = $derived(history?.days ?? []);
  let month = $derived(
    (days.at(-1)?.date ?? new Date().toISOString()).slice(0, 7),
  );
  let hasUsage = $derived(
    days.some(
      (day) =>
        day.calls > 0 || day.settledMicrousd > 0 || day.pendingMicrousd > 0,
    ),
  );
  let canvas = $state<HTMLCanvasElement>();

  $effect(() => {
    const chartDays = days;
    const settled = m.costSettled;
    const pending = m.costPending;
    if (!canvas || !hasUsage) return;
    const chartCanvas = canvas;
    let chart: ChartInstance | undefined;
    let cancelled = false;
    const render = async () => {
      const { default: Chart } = await import('chart.js/auto');
      if (cancelled) return;
      chart?.destroy();
      const probe = document.createElement('span');
      document.body.appendChild(probe);
      const color = (name: string) => {
        probe.style.color = `var(${name})`;
        return getComputedStyle(probe).color;
      };
      const colors = {
        series: color('--ui-series-1'),
        text: color('--ui-text-muted'),
        border: color('--ui-border'),
      };
      probe.remove();
      chart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
          labels: chartDays.map((day) => day.date.slice(8)),
          datasets: [
            {
              label: settled,
              data: chartDays.map((day) => day.settledMicrousd / 1_000_000),
              backgroundColor: colors.series,
              borderRadius: 3,
            },
            {
              label: pending,
              data: chartDays.map((day) => day.pendingMicrousd / 1_000_000),
              backgroundColor: colors.text,
              borderRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              stacked: true,
              ticks: { color: colors.text, maxRotation: 0, maxTicksLimit: 8 },
              grid: { display: false },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: { color: colors.text, callback: (value) => `$${value}` },
              grid: { color: colors.border },
            },
          },
        },
      });
    };
    void render();
    const observer = new MutationObserver(() => {
      void render();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style', 'class'],
    });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onTheme = () => {
      void render();
    };
    media.addEventListener('change', onTheme);
    return () => {
      cancelled = true;
      observer.disconnect();
      media.removeEventListener('change', onTheme);
      chart?.destroy();
    };
  });
</script>

<section class="context-panel cost-panel" aria-labelledby="ai-cost-title">
  <div class="cost-heading">
    <div>
      <h2 id="ai-cost-title">{m.costTitle}</h2>
      <p class="text-muted">{month} · UTC</p>
    </div>
  </div>
  <div class="metrics">
    <div>
      <span>{m.costUsed}</span><strong>
        {money.format(usage.monthCostMicrousd / 1_000_000)}
      </strong>
    </div>
    <div>
      <span>{m.costRemaining}</span><strong>
        {money.format(
          Math.max(0, usage.monthlyBudgetMicrousd - usage.monthCostMicrousd) /
            1_000_000,
        )}
      </strong>
    </div>
    <div>
      <span>{m.budget}</span><strong>
        {money.format(usage.monthlyBudgetMicrousd / 1_000_000)}
      </strong>
    </div>
    <div>
      <span>{m.calls}</span><strong>{number.format(usage.monthCalls)}</strong>
    </div>
  </div>
  <p class="text-muted note">{m.costDisclaimer}</p>
  {#if history === null}
    <p role="status">{m.costUnavailable}</p>
  {:else if !hasUsage}
    <p class="empty">{m.costEmpty}</p>
  {:else}
    <div class="legend">
      <span>
        <i class="settled"></i>{m.costSettled}: {money.format(
          history.settledMicrousd / 1_000_000,
        )}
      </span><span>
        <i class="pending"></i>{m.costPending}: {money.format(
          history.pendingMicrousd / 1_000_000,
        )}
      </span>
    </div>
    <div class="chart">
      <canvas bind:this={canvas} aria-hidden="true"></canvas>
    </div>
    <details>
      <summary>{m.costTable}</summary>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{m.costDate}</th><th scope="col">
                {m.costSettled}
              </th><th scope="col">{m.costPending}</th><th scope="col">
                {m.calls}
              </th>
            </tr>
          </thead><tbody>
            {#each days as day (day.date)}<tr>
                <th scope="row">{day.date}</th><td>
                  {money.format(day.settledMicrousd / 1_000_000)}
                </td><td>
                  {money.format(day.pendingMicrousd / 1_000_000)}
                </td><td>{number.format(day.calls)}</td>
              </tr>{/each}
          </tbody>
        </table>
      </div>
    </details>
  {/if}
</section>

<style>
  .cost-panel {
    display: grid;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  h2,
  p {
    margin: 0;
  }
  h2 {
    font-size: 1.15rem;
  }
  .cost-heading p,
  .note {
    font-size: 0.875rem;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
  }
  .metrics div {
    display: grid;
    gap: 0.35rem;
    padding: 0.85rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-background);
  }
  .metrics span {
    color: var(--ui-text-muted);
    font-size: 0.8rem;
  }
  .metrics strong {
    font-size: 1.15rem;
    overflow-wrap: anywhere;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    font-size: 0.875rem;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .legend i {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    background: var(--ui-series-1);
  }
  .legend i.pending {
    background: var(--ui-text-muted);
  }
  .chart {
    position: relative;
    height: 14rem;
    min-width: 0;
  }
  .empty {
    padding: 1.5rem;
    text-align: center;
    color: var(--ui-text-muted);
    background: var(--ui-background);
    border-radius: var(--ui-radius-sm);
  }
  summary {
    cursor: pointer;
    color: var(--ui-link);
    font-weight: 600;
    min-height: 44px;
    padding-block: 0.6rem;
  }
  summary:focus-visible {
    outline: 3px solid var(--ui-focus);
    outline-offset: 2px;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    text-align: start;
  }
  th,
  td {
    padding: 0.5rem;
    border-bottom: 1px solid var(--ui-border);
    text-align: start;
    white-space: nowrap;
  }
  @media (max-width: 640px) {
    .metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
