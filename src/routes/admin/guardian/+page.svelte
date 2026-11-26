<script lang="ts">
  import { brand } from '$lib/brand';
  import { uiMessages } from '$lib/i18n/locale';
  import '../admin-context.css';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(uiMessages(data.locale).guardian);
  let ai = $derived(uiMessages(data.locale).aiInsights);
  let number = $derived(new Intl.NumberFormat(data.locale));
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>
<div class="admin-page">
  <header class="context-header">
    <h1>{m.title}</h1>
    <p class="text-muted">{m.intro}</p>
  </header>
  <section class="context-panel section" aria-labelledby="guardian-traffic">
    <h2 id="guardian-traffic">{m.traffic}</h2>
    <p class="text-muted">{ai.intro}</p>
    {#if data.traffic.status === 'unavailable'}<p>{ai.unavailable}</p>
    {:else if data.traffic.status === 'insufficient'}<p>{ai.insufficient}</p>
    {:else}
      <div class="periods">
        <div>
          <span>{ai.current}</span><strong>
            {number.format(data.traffic.current.visits ?? 0)}
          </strong><small>
            {data.traffic.periods.current.startDate} – {data.traffic.periods
              .current.endDate}
          </small>
        </div>
        <div>
          <span>{ai.previous}</span><strong>
            {number.format(data.traffic.previous.visits ?? 0)}
          </strong><small>
            {data.traffic.periods.previous.startDate} – {data.traffic.periods
              .previous.endDate}
          </small>
        </div>
      </div>
      <p>
        {data.traffic.anomalies[0]
          ? data.traffic.anomalies[0].kind === 'traffic_drop'
            ? ai.signalDrop
            : ai.signalSpike
          : ai.noSignal}
      </p>
    {/if}
    {#if data.traffic.warnings.length}<p class="text-muted">
        {ai.warnings}: {data.traffic.warnings
          .map((warning) => ai[warning])
          .join(' · ')}
      </p>{/if}
    <a class="text-link" href="/admin/analytics/insights">{ai.title} →</a>
  </section>
  {#if !data.demoGuest}<section
      class="context-panel section"
      aria-labelledby="guardian-check"
    >
      <h2 id="guardian-check">{m.checkTitle}</h2>
      <p class="text-muted">{m.checkHelp}</p>
      {#if data.links.length}
        <form method="POST" action="?/check" class="check-form">
          <input type="hidden" name="csrfToken" value={data.csrfToken} />
          <label for="guardian-link">{m.chooseLink}</label>
          <select
            id="guardian-link"
            class="admin-control"
            name="linkId"
            required
          >
            {#each data.links as link (link.id)}<option
                value={link.id}
                selected={form?.code === 'checked' && form.linkId === link.id}
              >
                {link.title
                  ? `${link.title} · `
                  : ''}{link.hostname}/{link.slug}
              </option>{/each}
          </select>
          <button class="admin-button admin-button-primary" type="submit">
            {m.check}
          </button>
        </form>
      {:else}<p>{m.empty}</p>{/if}
      {#if data.nextCursor}<a
          class="text-link"
          href={`?cursor=${encodeURIComponent(data.nextCursor)}`}
        >
          {m.next} →
        </a>{/if}
      {#if form?.code === 'checked'}
        <div class="result" role="status">
          <h3>{m.result}</h3>
          <p><strong>{m[form.result.status]}</strong></p>
          <p>{m.hops}: {number.format(form.result.checkedHops)}</p>
          {#if form.result.loop.length}<ol>
              {#each form.result.loop as hop (`${hop.hostname}/${hop.slug}`)}<li>
                  <code>{hop.hostname}/{hop.slug}</code>
                </li>{/each}
            </ol>{/if}
          {#if form.result.dns}<p>{m[form.result.dns]}</p>
            <p class="text-muted">{m.dnsHelp}</p>{/if}
        </div>
      {:else if form}<p class="result" role="alert">{m[form.code]}</p>{/if}
    </section>{/if}
</div>

<style>
  .section {
    display: grid;
    gap: 0.8rem;
    margin-bottom: 1rem;
  }
  h2 {
    font-size: 1.15rem;
  }
  h3 {
    font-size: 1rem;
  }
  h2,
  h3,
  p {
    margin: 0;
  }
  .periods {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  .periods div {
    display: grid;
    gap: 0.25rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    padding: 0.8rem;
  }
  .periods span,
  small {
    color: var(--ui-text-muted);
  }
  .periods strong {
    font-size: 1.5rem;
  }
  .check-form {
    display: grid;
    gap: 0.5rem;
    justify-items: start;
  }
  select {
    width: min(100%, 38rem);
  }
  .result {
    padding: 1rem;
    border-left: 3px solid var(--ui-primary);
    background: var(--ui-accent-surface);
    display: grid;
    gap: 0.5rem;
    overflow-wrap: anywhere;
  }
  .result ol {
    margin: 0;
    padding-inline-start: 1.5rem;
  }
  @media (max-width: 480px) {
    .periods {
      grid-template-columns: 1fr;
    }
  }
</style>
