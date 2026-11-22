<script lang="ts">
  import type { Locale } from '$lib/i18n/locale';
  import { analyticsArchiveMessages, analyticsMessages } from './messages';
  import ReportChart from './ReportChart.svelte';
  import type { loadAnalyticsReport } from '$lib/server/analytics/report';
  let {
    locale,
    report,
    failed,
    base,
    filters,
    domains = [],
    linkScoped = false,
  }: {
    locale: Locale;
    report: Awaited<ReturnType<typeof loadAnalyticsReport>> | null;
    failed: boolean | 'unsupported_archive_filters';
    base: string;
    filters: Record<string, string>;
    domains?: readonly { id: string; hostname: string }[];
    linkScoped?: boolean;
  } = $props();
  let m = $derived(analyticsMessages(locale));
  let archive = $derived(analyticsArchiveMessages(locale));
  const allDimensions = [
    'country',
    'region',
    'referrer',
    'device',
    'os',
    'browser',
    'rule',
    'source',
    'traffic',
    'link',
  ] as const;
  let dimensions = $derived(
    linkScoped ? allDimensions.slice(0, -1) : allDimensions,
  );
  let exportQuery = $derived(new URLSearchParams(filters).toString());
  let formatDay = $derived(
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }),
  );

  function filterUrl(dimension?: string, key?: string) {
    const params = new URLSearchParams(filters);
    if (dimension && key) {
      params.set('filter', dimension);
      params.set('key', key);
    } else {
      params.delete('filter');
      params.delete('key');
    }
    return `${base}?${params.toString()}`;
  }
  function clearArchiveFiltersUrl() {
    const params = new URLSearchParams(filters);
    for (const key of ['ruleId', 'source', 'filter', 'key']) params.delete(key);
    return `${base}?${params.toString()}`;
  }
  const trafficLabels = {
    en: ['Bots', 'Previews', 'Clear filter', 'All domains'],
    ja: ['ボット', 'プレビュー', '絞り込みを解除', 'すべてのドメイン'],
    'zh-CN': ['机器人', '预览', '清除筛选', '所有域名'],
    'zh-TW': ['機器人', '預覽', '清除篩選', '所有網域'],
    es: ['Robots', 'Vistas previas', 'Quitar filtro', 'Todos los dominios'],
    it: ['Bot', 'Anteprime', 'Rimuovi filtro', 'Tutti i domini'],
    fr: ['Robots', 'Aperçus', 'Effacer le filtre', 'Tous les domaines'],
  } satisfies Record<Locale, string[]>;
  let traffic = $derived(trafficLabels[locale]);
</script>

<h1>{linkScoped ? m.linkTitle : m.title}</h1>
<form method="GET" class="filters">
  <label>
    {m.from}<input type="date" name="from" value={filters.from} required />
  </label>
  <label>
    {m.to}<input type="date" name="to" value={filters.to} required />
  </label>
  <label>
    {m.dimension}<select name="dimension">
      {#each dimensions as dim (dim)}<option
          value={dim}
          selected={filters.dimension === dim}
        >
          {m[dim]}
        </option>{/each}
    </select>
  </label>
  <label>
    {m.source}<select name="source">
      <option value="">{m.all}</option><option
        value="link"
        selected={filters.source === 'link'}
      >
        {m.link}
      </option><option value="qr" selected={filters.source === 'qr'}>
        {m.qr}
      </option>
    </select>
  </label>
  {#if !linkScoped && domains.length}
    <label>
      {m.domain}<select name="domainId">
        <option value="">{traffic[3]}</option>
        {#each domains as domain (domain.id)}
          <option value={domain.id} selected={filters.domainId === domain.id}>
            {domain.hostname}
          </option>
        {/each}
      </select>
    </label>
  {:else if filters.domainId}
    <input type="hidden" name="domainId" value={filters.domainId} />
  {/if}
  {#if filters.ruleId}<input
      type="hidden"
      name="ruleId"
      value={filters.ruleId}
    />{/if}
  <input type="hidden" name="tz" value={filters.tz} />
  {#if filters.filter && filters.key}
    <input type="hidden" name="filter" value={filters.filter} />
    <input type="hidden" name="key" value={filters.key} />
  {/if}
  <button type="submit">{m.apply}</button>
</form>
{#if failed}
  <p class="notice" role="alert">
    {failed === 'unsupported_archive_filters'
      ? archive.unsupportedFilters
      : m.error}
  </p>
  {#if failed === 'unsupported_archive_filters'}
    <p class="filter-links">
      <a href={clearArchiveFiltersUrl()}>{archive.clearFilters}</a>
    </p>
  {/if}
{:else if report}
  <div class="report-head">
    <div>
      <strong class="count">
        {report.totalClicks?.toLocaleString(locale) ?? '—'}
      </strong><span> {m.clicks}</span>
    </div>
    <a class="export" href={`${base}/export?${exportQuery}`}>{m.export}</a>
  </div>
  <p class="meta">
    {m.timezone}: {report.meta
      .timezone}{#if report.meta.dateBasis === 'UTC' && report.meta.timezone !== 'UTC'}
      · UTC{/if}{#if report.meta.source === 'daily-rollup'}
      · {archive.dailySource}{:else if report.meta.source !== 'analytics-engine'}
      · {m.sample}{/if}{#if report.meta.estimated}
      · {m.estimated}{/if}{#if report.meta.gaps.length}
      · {m.incomplete}{/if}
  </p>
  {#if report.meta.source === 'daily-rollup' && filters.domainId}
    <p class="meta">{archive.domainScope}</p>
  {/if}
  {#if filters.filter && filters.key}
    <p class="filter-links">
      <span>{filters.key}</span> <a href={filterUrl()}>{traffic[2]}</a>
    </p>
  {/if}
  {#if report.totalClicks === 0 && report.meta.gaps.length === 0}<p>
      {m.empty}
    </p>{/if}
  <section>
    <h2>{m.daily}</h2>
    {#if (report.totalClicks ?? 0) > 0}
      <ReportChart
        kind="line"
        labels={report.series.map((row) =>
          formatDay.format(new Date(`${row.date}T00:00:00Z`)),
        )}
        values={report.series.map((row) => row.clicks)}
        label={m.clicks}
      />
    {/if}
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th scope="col">{m.date}</th><th scope="col">{m.clicks}</th></tr>
        </thead><tbody>
          {#each report.series as row (row.date)}<tr>
              <th scope="row">
                <time datetime={row.date}>
                  {formatDay.format(new Date(`${row.date}T00:00:00Z`))}
                </time>
              </th><td>
                {row.clicks?.toLocaleString(locale) ?? archive.missing}
              </td>
            </tr>{/each}
        </tbody>
      </table>
    </div>
  </section>
  <section>
    <h2>{m.breakdown}</h2>
    {#if report.dimension === 'traffic'}
      <p class="filter-links">
        <a href={filterUrl('traffic', 'bot')}>{traffic[0]}</a>
        <a href={filterUrl('traffic', 'preview')}>{traffic[1]}</a>
      </p>
    {/if}
    {#if (report.totalClicks ?? 0) > 0 && report.breakdown.length}
      <ReportChart
        kind="bar"
        labels={report.breakdown.map((row) => row.key || '—')}
        values={report.breakdown.map((row) => row.clicks)}
        label={m.clicks}
      />
    {/if}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">{m.category}</th><th scope="col">{m.clicks}</th>
          </tr>
        </thead><tbody>
          {#each report.breakdown as row (row.key)}<tr>
              <th scope="row">
                {#if row.key}<a href={filterUrl(report.dimension, row.key)}>
                    {row.key}
                  </a>{:else}—{/if}
              </th><td>
                {row.clicks.toLocaleString(locale)}
              </td>
            </tr>{/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}

<style>
  h1 {
    font-size: 2rem;
    font-weight: 650;
    margin-bottom: 1.5rem;
  }
  h2 {
    font-size: 1.2rem;
    font-weight: 650;
    margin-bottom: 0.75rem;
  }
  section {
    margin-top: 2rem;
  }
  .filter-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin: 0.75rem 0;
  }
  .filter-links a,
  th a {
    color: var(--ui-link);
    text-decoration: underline;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 0.8rem;
    padding: 1rem;
    background: var(--ui-surface);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
  }
  label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.875rem;
    font-weight: 600;
  }
  input,
  select {
    min-width: 0;
    max-width: 100%;
    padding: 0.55rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-surface);
    color: var(--ui-text);
  }
  button,
  .export {
    padding: 0.6rem 1rem;
    border-radius: var(--ui-radius-sm);
    background: var(--ui-accent-surface);
    color: var(--ui-link);
    font-weight: 650;
  }
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--brand-signal);
    outline-offset: 2px;
  }
  .report-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 2rem;
  }
  .count {
    font-size: 2rem;
    margin-inline-end: 0.3rem;
  }
  .meta {
    color: var(--ui-text-muted);
    margin-top: 0.5rem;
  }
  .notice {
    margin-top: 1.5rem;
    color: var(--ui-text);
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--ui-surface);
  }
  th,
  td {
    padding: 0.7rem;
    border-bottom: 1px solid var(--ui-border);
    text-align: left;
  }
  th {
    font-weight: 600;
  }
  td {
    width: 65%;
  }
  @media (max-width: 600px) {
    .filters label {
      flex: 1 1 140px;
    }
    .filters button {
      width: 100%;
    }
  }
</style>
