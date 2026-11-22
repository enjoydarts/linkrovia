<script lang="ts">
  import { brand } from '$lib/brand';
  import ReportChart from '$lib/components/analytics/ReportChart.svelte';
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import Link2 from '@lucide/svelte/icons/link-2';
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
  </header>
  <div class="cards">
    <a href="/admin/links/new" class="card primary">
      <span class="card-icon" aria-hidden="true"><Link2 size={20} /></span><span
        class="card-name"
      >
        {links.links}
      </span><span class="card-action">
        {links.create} <span aria-hidden="true">→</span>
      </span>
    </a>
    <a href="/admin/domains" class="card">
      <span class="card-icon" aria-hidden="true"><Globe size={20} /></span><span
        class="card-name"
      >
        {links.domains}
      </span><span class="card-action">
        {links.addDomain} <span aria-hidden="true">→</span>
      </span>
    </a>
    <a href="/admin/settings" class="card">
      <span class="card-icon" aria-hidden="true">
        <Settings size={20} />
      </span><span class="card-name">
        {preferences.settings}
      </span><span class="card-action">
        {preferences.personal} <span aria-hidden="true">→</span>
      </span>
    </a>
  </div>
  <section class="analytics" aria-labelledby="analytics-heading">
    <div class="recent-heading">
      <h2 id="analytics-heading">{analytics.title}</h2>
      <a href="/admin/analytics">
        {labels[4]} <span aria-hidden="true">→</span>
      </a>
    </div>
    {#if data.report}
      <div class="analytics-panel">
        <p class="period">
          {labels[0]} · {data.report.meta.from} – {data.report.meta.to} · {analytics.timezone}:
          {data.report.meta
            .timezone}{#if data.report.meta.dateBasis === 'UTC' && data.report.meta.timezone !== 'UTC'}
            · UTC{/if}
        </p>
        <p>
          <strong class="click-count">
            {data.report.totalClicks?.toLocaleString(data.locale) ?? '—'}
          </strong>
          {analytics.clicks}
        </p>
        <p class="period">
          {data.report.meta.source === 'analytics-engine'
            ? labels[3]
            : analytics.sample}{#if data.report.meta.estimated}
            · {analytics.estimated}{/if}
        </p>
        <h3>{analytics.daily}</h3>
        <ReportChart
          kind="line"
          labels={data.report.series.map((row) => row.date)}
          values={data.report.series.map((row) => row.clicks)}
          label={analytics.clicks}
        />
        <details>
          <summary>{analytics.daily}</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">{analytics.date}</th><th scope="col">
                  {analytics.clicks}
                </th>
              </tr>
            </thead><tbody>
              {#each data.report.series as row (row.date)}<tr>
                  <th scope="row">{row.date}</th><td>
                    {row.clicks?.toLocaleString(data.locale) ?? '—'}
                  </td>
                </tr>{/each}
            </tbody>
          </table>
        </details>
        <h3>{labels[1]}</h3>
        {#if data.popularLinks.length}
          <ul class="popular">
            {#each data.popularLinks as link (link.key)}<li>
                <span>
                  {#if link.id}<a href={`/admin/links/${link.id}`}>
                      {link.title || link.url}
                    </a>{:else}{link.key || '—'}{/if}
                </span><strong>
                  {link.clicks.toLocaleString(data.locale)}
                </strong>
              </li>{/each}
          </ul>
        {:else}<p>{analytics.empty}</p>{/if}
      </div>
    {:else}<p role="status">
        {labels[2]} · <a href="/admin/analytics">{labels[4]}</a>
      </p>{/if}
  </section>
  <section class="recent" aria-labelledby="recent-links">
    <div class="recent-heading">
      <h2 id="recent-links">{messages['admin.recent']}</h2>
      <a href="/admin/links">{links.links} <span aria-hidden="true">→</span></a>
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
    {:else}
      <p>{links.empty}</p>
    {/if}
  </section>
</div>

<style>
  .overview {
    max-width: 1100px;
  }
  .overview-header {
    margin-bottom: 36px;
  }
  h1 {
    font-size: clamp(30px, 4vw, 40px);
    font-weight: 650;
    letter-spacing: -0.04em;
    line-height: 1.1;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .card {
    display: flex;
    min-height: 174px;
    flex-direction: column;
    align-items: flex-start;
    padding: 23px;
    border: 1px solid var(--ui-border);
    border-radius: 14px;
    background: var(--ui-surface);
    color: var(--ui-text);
    text-decoration: none;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .card:hover {
    border-color: var(--ui-primary);
    transform: translateY(-2px);
  }
  .card-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--ui-accent-surface);
    color: var(--ui-link);
    font-size: 22px;
  }
  .card-name {
    margin-top: 18px;
    font-size: 16px;
    font-weight: 650;
  }
  .card-action {
    margin-top: auto;
    padding-top: 10px;
    color: var(--ui-text-muted);
    font-size: 13px;
  }
  @media (max-width: 760px) {
    .cards {
      grid-template-columns: 1fr;
    }
    .card {
      min-height: 145px;
    }
  }

  .analytics {
    margin-top: 2.4rem;
  }
  .analytics-panel {
    padding: 1.25rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.9rem;
    background: var(--ui-surface);
  }
  .analytics-panel h3 {
    margin-top: 1.5rem;
    font-size: 1rem;
  }
  .period {
    color: var(--ui-text-muted);
    font-size: 0.85rem;
    margin: 0.4rem 0;
  }
  .click-count {
    font-size: 2rem;
  }
  .popular {
    margin-top: 0.75rem;
  }
  .popular li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.65rem 0;
    border-top: 1px solid var(--ui-border);
    overflow-wrap: anywhere;
  }
  details {
    margin-top: 1rem;
  }
  table {
    width: 100%;
    text-align: left;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.4rem;
    border-bottom: 1px solid var(--ui-border);
  }
  .recent {
    margin-top: 2.4rem;
  }
  .recent-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.85rem;
  }
  .recent-heading h2 {
    font-size: 1.21rem;
    font-weight: 680;
    letter-spacing: -0.025em;
  }
  .recent-heading > a {
    color: var(--ui-text-muted);
    font-weight: 610;
    font-size: 0.86rem;
    white-space: nowrap;
  }
  .recent ul {
    overflow: hidden;
    border: 1px solid var(--ui-border);
    border-radius: 0.9rem;
    background: var(--ui-surface);
  }
  .recent li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.82rem 1.05rem;
  }
  .recent li + li {
    border-top: 1px solid var(--ui-border);
  }
  .recent-item {
    min-width: 0;
    display: grid;
    gap: 0.2rem;
  }
  .recent-item:hover strong,
  .recent-item:hover span {
    text-decoration: underline;
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
  .recent > p {
    color: var(--ui-text-muted);
  }
</style>
