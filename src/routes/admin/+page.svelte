<script lang="ts">
  import { brand } from '$lib/brand';
  import ReportChart from '$lib/components/analytics/ReportChart.svelte';
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import Plus from '@lucide/svelte/icons/plus';
  import Globe from '@lucide/svelte/icons/globe';
  import Settings from '@lucide/svelte/icons/settings';
  import { messagesFor } from '$lib/i18n/locale';
  import { linkMessages } from '$lib/i18n/links';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
  let messages = $derived(messagesFor(data.locale));
  let links = $derived(linkMessages(data.locale));
  let preferences = $derived(preferenceMessages(data.locale));
  let analytics = $derived(analyticsMessages(data.locale));
  const dashboardLabels = {
    en: [
      'Last 14 days',
      'Popular links',
      'Analytics unavailable',
      'Analytics data may be delayed',
      'View analytics',
    ],
    ja: [
      '過去14日間',
      '人気のリンク',
      '解析データを取得できません',
      '解析データの反映には時間がかかる場合があります',
      'アクセス解析を見る',
    ],
    'zh-CN': [
      '过去 14 天',
      '热门链接',
      '无法获取分析数据',
      '分析数据可能延迟',
      '查看数据分析',
    ],
    'zh-TW': [
      '過去 14 天',
      '熱門連結',
      '無法取得分析資料',
      '分析資料可能延遲',
      '查看數據分析',
    ],
    es: [
      'Últimos 14 días',
      'Enlaces populares',
      'Analítica no disponible',
      'Los datos pueden tardar en aparecer',
      'Ver analítica',
    ],
    it: [
      'Ultimi 14 giorni',
      'Link più popolari',
      'Analisi non disponibili',
      'I dati potrebbero essere aggiornati in ritardo',
      'Visualizza analisi',
    ],
    fr: [
      '14 derniers jours',
      'Liens populaires',
      'Analyses indisponibles',
      'Les données peuvent apparaître avec un délai',
      'Voir les analyses',
    ],
  } as const;
  let labels = $derived(dashboardLabels[data.locale]);
</script>

<svelte:head>
  <title>{messages['admin.title']} · {brand.name}</title>
</svelte:head>
<div class="overview">
  <header class="overview-header">
    <h1>{messages['admin.title']}</h1>
    <a href="/admin/links/new" class="create-link">
      <Plus size={17} aria-hidden="true" />{links.create}
    </a>
  </header>
  <nav class="overview-shortcuts" aria-label={messages['admin.overview']}>
    <a href="/admin/domains" class="workspace-link">
      <Globe size={16} aria-hidden="true" />{links.domains}
    </a>
    <a href="/admin/settings" class="workspace-link">
      <Settings size={16} aria-hidden="true" />{preferences.settings}
    </a>
  </nav>
  <div class="dashboard-content">
    <section class="analytics card" aria-labelledby="analytics-heading">
      <div class="section-heading">
        <h2 id="analytics-heading">{analytics.title}</h2>
        <a href="/admin/analytics">
          {labels[4]} <span aria-hidden="true">→</span>
        </a>
      </div>
      {#if data.report}
        <div class="metric-header">
          <div>
            <p class="metric-label">{analytics.clicks}</p>
            <p class="click-count">
              {data.report.totalClicks?.toLocaleString(data.locale) ?? '—'}
            </p>
          </div>
          <p class="period">
            {labels[0]}<br />{data.report.meta.from} – {data.report.meta.to}
          </p>
        </div>
        <div class="chart-heading">
          <h3>{analytics.daily}</h3>
          <span>
            {analytics.timezone}: {data.report.meta
              .timezone}{#if data.report.meta.dateBasis === 'UTC' && data.report.meta.timezone !== 'UTC'}
              · UTC{/if}
          </span>
        </div>
        <ReportChart
          kind="line"
          labels={data.report.series.map((row) => row.date)}
          values={data.report.series.map((row) => row.clicks)}
          label={analytics.clicks}
        />
        <div class="chart-footer">
          <p>
            {data.report.meta.source === 'analytics-engine'
              ? labels[3]
              : analytics.sample}{#if data.report.meta.estimated}
              · {analytics.estimated}{/if}
          </p>
          <details>
            <summary>{analytics.daily}</summary>
            <table>
              <thead>
                <tr>
                  <th scope="col">{analytics.date}</th><th scope="col">
                    {analytics.clicks}
                  </th>
                </tr>
              </thead>
              <tbody>
                {#each data.report.series as row (row.date)}
                  <tr>
                    <th scope="row">{row.date}</th><td>
                      {row.clicks?.toLocaleString(data.locale) ?? '—'}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </details>
        </div>
      {:else}
        <p class="empty" role="status">
          {labels[2]} · <a href="/admin/analytics">{labels[4]}</a>
        </p>
      {/if}
    </section>
    <div class="link-cards">
      {#if data.report}
        <section class="card link-card" aria-labelledby="popular-heading">
          <div class="section-heading">
            <h2 id="popular-heading">{labels[1]}</h2>
            <a href="/admin/analytics">
              {labels[4]} <span aria-hidden="true">→</span>
            </a>
          </div>
          {#if data.popularLinks.length}
            <ul class="popular">
              {#each data.popularLinks as link (link.key)}
                <li>
                  <span>
                    {#if link.id}<a href={`/admin/links/${link.id}/analytics`}>
                        {link.title || link.url}
                      </a>{:else}{link.key || '—'}{/if}
                  </span><strong>
                    {link.clicks.toLocaleString(data.locale)}
                  </strong>
                </li>
              {/each}
            </ul>
          {:else}<p class="empty">{analytics.empty}</p>{/if}
        </section>
      {/if}
      <section class="card link-card recent" aria-labelledby="recent-links">
        <div class="section-heading">
          <h2 id="recent-links">{messages['admin.recent']}</h2>
          <a href="/admin/links">
            {links.links} <span aria-hidden="true">→</span>
          </a>
        </div>
        {#if data.recentLinks.length}
          <ul>
            {#each data.recentLinks as link (link.id)}
              <li>
                <a class="recent-item" href={`/admin/links/${link.id}`}>
                  {#if link.title}<strong>{link.title}</strong>{/if}
                  <span>{link.shortUrl.replace(/^https?:\/\//, '')}</span>
                </a>
                <span class:enabled={link.isActive} class="state-indicator">
                  {link.isActive ? links.active : links.inactive}
                </span>
              </li>
            {/each}
          </ul>
        {:else}<p class="empty">{links.empty}</p>{/if}
      </section>
    </div>
  </div>
</div>

<style>
  .overview {
    max-width: 1200px;
  }
  .overview-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  h1 {
    font-size: clamp(30px, 4vw, 40px);
    font-weight: 650;
    letter-spacing: -0.04em;
    line-height: 1.1;
  }
  .create-link {
    display: inline-flex;
    gap: 0.55rem;
    align-items: center;
    min-height: 44px;
    padding-inline: 1rem;
    border-radius: var(--ui-radius-sm);
    background: var(--ui-primary);
    color: var(--ui-on-primary);
    font-size: 0.875rem;
    font-weight: 650;
  }
  .create-link:hover {
    background: var(--ui-primary-hover);
  }
  .overview-shortcuts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .workspace-link {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    font-size: 0.85rem;
    font-weight: 600;
  }
  .workspace-link:hover {
    color: var(--ui-primary);
    background: var(--ui-surface);
  }
  .dashboard-content {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr);
    align-items: start;
    gap: 1.25rem;
    margin-top: 1.5rem;
  }
  .card {
    min-width: 0;
    border: 1px solid var(--ui-border);
    border-radius: 0.9rem;
    background: var(--ui-surface);
  }
  .analytics {
    padding: 1.4rem;
  }
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .section-heading h2 {
    font-size: 1.05rem;
    font-weight: 680;
    letter-spacing: -0.02em;
  }
  .section-heading > a {
    color: var(--ui-text-muted);
    font-size: 0.82rem;
    font-weight: 610;
    text-align: right;
  }
  .section-heading > a:hover {
    color: var(--ui-primary);
  }
  .metric-header {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin: 2rem 0 1.5rem;
  }
  .metric-label,
  .period,
  .chart-heading span,
  .chart-footer,
  .empty {
    color: var(--ui-text-muted);
    font-size: 0.83rem;
  }
  .metric-label {
    font-weight: 600;
  }
  .click-count {
    margin-top: 0.2rem;
    font-size: clamp(2.75rem, 5vw, 4rem);
    font-weight: 700;
    letter-spacing: -0.055em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .period {
    text-align: right;
    line-height: 1.6;
  }
  .chart-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    padding-top: 1.15rem;
    border-top: 1px solid var(--ui-border);
  }
  .chart-heading h3 {
    font-size: 0.9rem;
    font-weight: 650;
  }
  .chart-footer {
    border-top: 1px solid var(--ui-border);
    padding-top: 0.85rem;
    line-height: 1.5;
  }
  details {
    margin-top: 0.6rem;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  table {
    width: 100%;
    margin-top: 0.6rem;
    text-align: left;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.4rem;
    border-bottom: 1px solid var(--ui-border);
  }
  .link-cards {
    display: grid;
    gap: 1.25rem;
  }
  .link-card {
    padding: 1.25rem;
  }
  .link-card ul {
    margin-top: 1rem;
  }
  .link-card li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: 3.25rem;
    padding: 0.75rem 0;
    border-top: 1px solid var(--ui-border);
  }
  .popular li span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .popular li a:hover,
  .recent-item:hover {
    text-decoration: underline;
  }
  .popular li strong {
    flex: none;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }
  .recent-item {
    min-width: 0;
    display: grid;
    gap: 0.2rem;
  }
  .recent-item span {
    overflow-wrap: anywhere;
    color: var(--ui-text-muted);
    font-size: 0.83rem;
  }
  .state-indicator {
    flex: none;
    border-radius: 999px;
    padding: 0.3rem 0.58rem;
    color: var(--ui-text-muted);
    background: var(--ui-background);
    font-size: 0.76rem;
  }
  .state-indicator.enabled {
    color: var(--ui-positive);
    background: var(--ui-accent-surface);
  }
  .empty {
    margin-top: 1rem;
  }
  @media (max-width: 1000px) {
    .dashboard-content {
      grid-template-columns: 1fr;
    }
    .link-cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 650px) {
    .link-cards {
      grid-template-columns: 1fr;
    }
    .analytics,
    .link-card {
      padding: 1.1rem;
    }
    .metric-header {
      margin-block: 1.5rem;
    }
    .period {
      text-align: left;
    }
  }
</style>
