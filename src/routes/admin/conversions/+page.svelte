<script lang="ts">
  import { brand } from '$lib/brand';
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import {
    conversionMessages,
    manageHelp,
    goalHelp,
    ratePending,
    archivedDates,
  } from './messages';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(conversionMessages(data.locale));
  let dateLabels = $derived(analyticsMessages(data.locale));
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>
<header>
  <h1>{m.title}</h1>
  <p>{m.intro}</p>
</header>
{#if data.saved}<p class="notice" role="status">{m.saved}</p>{/if}
{#if form?.code}<p class="notice" role="alert">{m.error}</p>{/if}
{#if !data.isOwner}<p class="notice">{m.readOnly}</p>{/if}
<section aria-labelledby="report">
  <h2 id="report">{m.report}</h2>
  <form method="GET" class="inline">
    {#if data.linkId}<input
        type="hidden"
        name="linkId"
        value={data.linkId}
      />{/if}
    <label>
      {dateLabels.from}<input
        type="date"
        name="from"
        value={data.from}
        required
      />
    </label>
    <label>
      {dateLabels.to}<input type="date" name="to" value={data.to} required />
    </label>
    <button type="submit">{dateLabels.apply}</button>
  </form>
  <p class="muted">{data.from} – {data.to} · {data.reportTimeZone}</p>
  {#if data.filterError}<p role="alert">{archivedDates[data.locale][0]}</p>{/if}
  {#if data.summary.some((goal) => goal.partialUtcDays)}<p class="muted">
      {archivedDates[data.locale][1]}
    </p>{/if}
  <p class="muted">{m.rateHelp} {ratePending[data.locale]}</p>
  {#if data.summary.length === 0}<p>{m.none}</p>{:else}<div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">{m.goal}</th><th scope="col">{m.total}</th><th
              scope="col"
            >
              {m.attributed}
            </th><th scope="col">{m.unattributed}</th><th scope="col">
              {m.eligible}
            </th><th scope="col">{m.rate}</th>
          </tr>
        </thead><tbody>
          {#each data.summary as summary (summary.goalId)}<tr>
              <th scope="row">
                {summary.goalName}{#if summary.archived}
                  · {m.archive}{/if}
              </th><td>
                {summary?.total.toLocaleString(data.locale) ?? '0'}
              </td><td>
                {summary?.attributed.toLocaleString(data.locale) ?? '0'}
              </td><td>
                {summary?.unattributed.toLocaleString(data.locale) ?? '0'}
              </td><td>
                {summary?.eligibleClicks.toLocaleString(data.locale) ?? '0'}
              </td><td>
                {summary?.rate == null
                  ? '—'
                  : new Intl.NumberFormat(data.locale, {
                      style: 'percent',
                      maximumFractionDigits: 1,
                    }).format(summary.rate)}
              </td>
            </tr>{/each}
        </tbody>
      </table>
    </div>{/if}
</section>
{#if data.isOwner}<section aria-labelledby="create-goal">
    <h2 id="create-goal">{m.create}</h2>
    <form method="POST" action="?/create" class="card fields">
      <input type="hidden" name="csrfToken" value={data.csrfToken} /><label>
        {m.name}<input name="name" required maxlength="120" />
      </label><label>
        {m.event}<input name="eventName" required maxlength="120" />
      </label><label>
        {m.link}<select name="linkId">
          <option value="">
            {m.allLinks}
          </option>{#each data.links as link (link.id)}<option value={link.id}>
              {link.title || `${link.hostname}/${link.slug}`}
            </option>{/each}
        </select>
      </label><label>
        {m.window} ({m.hours})<input
          type="number"
          name="window"
          min="1"
          max="720"
          value="24"
          required
        />
      </label><label class="check">
        <input type="checkbox" name="active" value="1" checked />{m.active}
      </label><button type="submit">{m.create}</button>
    </form>
  </section>{/if}
{#if data.goals.length}<section aria-labelledby="goals">
    <h2 id="goals">{m.goal}</h2>
    <p class="muted">{goalHelp[data.locale]}</p>
    <div class="goal-list">
      {#each data.goals as goal (goal.id)}<div class="card">
          <h3>{goal.name}</h3>
          {#if data.isOwner}<form
              method="POST"
              action="?/update"
              class="fields"
            >
              <input
                type="hidden"
                name="csrfToken"
                value={data.csrfToken}
              /><input type="hidden" name="goalId" value={goal.id} /><label>
                {m.name}<input
                  name="name"
                  value={goal.name}
                  required
                  maxlength="120"
                />
              </label><label>
                {m.event}<input
                  name="eventName"
                  value={goal.eventName}
                  readonly
                />
              </label><label>
                {m.link}<input
                  value={goal.linkId
                    ? data.links.find((link) => link.id === goal.linkId)
                        ?.title ||
                      data.links.find((link) => link.id === goal.linkId)
                        ?.slug ||
                      goal.linkId
                    : m.allLinks}
                  readonly
                />
                <input type="hidden" name="linkId" value={goal.linkId ?? ''} />
              </label><label>
                {m.window} ({m.hours})<input
                  type="number"
                  name="window"
                  min="1"
                  max="720"
                  value={goal.attributionWindowHours}
                  required
                />
              </label><label class="check">
                <input
                  type="checkbox"
                  name="active"
                  value="1"
                  checked={goal.isActive}
                />{m.active}
              </label><button type="submit">{m.save}</button>
            </form>
            <form method="POST" action="?/archive">
              <input
                type="hidden"
                name="csrfToken"
                value={data.csrfToken}
              /><input type="hidden" name="goalId" value={goal.id} /><button
                type="submit"
                class="secondary"
              >
                {m.archive}
              </button>
            </form>{:else}<p>
              <code>{goal.eventName}</code> · {goal.attributionWindowHours}
              {m.hours} · {goal.isActive ? m.activeLabel : m.inactive}
            </p>{/if}
        </div>{/each}
    </div>
  </section>{/if}
<section aria-labelledby="tracking">
  <h2 id="tracking">{m.tracking}</h2>
  <p>{m.trackingHelp}</p>
  {#if data.links.length}<form method="GET" class="inline">
      <label>
        {m.link}<select name="linkId">
          <option value="">
            {m.select}
          </option>{#each data.links as link (link.id)}<option
              value={link.id}
              selected={data.tracking?.id === link.id}
            >
              {link.title || `${link.hostname}/${link.slug}`}
            </option>{/each}
        </select>
      </label><button type="submit">{m.select}</button>
    </form>{:else}<p>{m.noLinks}</p>{/if}{#if data.tracking}<p class="muted">
      {data.tracking.hostname}/{data.tracking.slug} · {data.tracking.enabled
        ? m.activeLabel
        : m.inactive}
    </p>
    {#if data.isOwner && data.tracking.eligible}<form
        method="POST"
        action="?/tracking"
        class="card"
      >
        <input type="hidden" name="csrfToken" value={data.csrfToken} /><input
          type="hidden"
          name="linkId"
          value={data.tracking.id}
        /><label class="check">
          <input
            type="checkbox"
            name="enabled"
            value="1"
            checked={data.tracking.enabled}
          />{m.trackingConsent}
        </label><button type="submit">{m.trackingSave}</button>
      </form>{/if}{/if}
</section>
<section aria-labelledby="integration">
  <h2 id="integration">{m.integration}</h2>
  <p>{m.integrationHelp}</p>
  <p>{manageHelp[data.locale]}</p>
</section>

<style>
  header,
  section {
    margin-bottom: 2rem;
  }
  h1 {
    font-size: 2rem;
    font-weight: 650;
  }
  h2 {
    font-size: 1.3rem;
    font-weight: 650;
    margin-bottom: 0.75rem;
  }
  h3 {
    font-weight: 650;
    margin-bottom: 0.75rem;
  }
  p {
    margin: 0.5rem 0;
  }
  .muted {
    color: var(--ui-text-muted);
    font-size: 0.9rem;
  }
  .notice,
  .card {
    padding: 1rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-surface);
  }
  .notice {
    margin: 1rem 0;
  }
  .goal-list {
    display: grid;
    gap: 1rem;
  }
  .fields {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 0.8rem;
  }
  label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.9rem;
    font-weight: 600;
  }
  input:not([type='checkbox']),
  select {
    padding: 0.55rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text);
    background: var(--ui-surface);
    max-width: 100%;
  }
  .check {
    display: flex;
    align-items: start;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  button {
    padding: 0.6rem 1rem;
    border-radius: var(--ui-radius-sm);
    background: var(--ui-accent-surface);
    color: var(--ui-link);
    font-weight: 650;
  }
  .secondary {
    margin-top: 0.75rem;
  }
  .inline {
    display: flex;
    align-items: end;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin: 1rem 0;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    background: var(--ui-surface);
  }
  th,
  td {
    border-bottom: 1px solid var(--ui-border);
    text-align: left;
    padding: 0.7rem;
  }
  th {
    font-weight: 600;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--brand-signal);
    outline-offset: 2px;
  }
  @media (max-width: 600px) {
    .fields label:not(.check) {
      flex: 1 1 140px;
    }
    .fields button {
      width: 100%;
    }
  }
</style>
