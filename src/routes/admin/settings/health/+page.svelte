<script lang="ts">
  import { brand } from '$lib/brand';
  import { adminInviteMessages } from '$lib/i18n/admin-invites';
  import { messagesFor } from '$lib/i18n/locale';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import '../../admin-context.css';
  import type { PageProps } from './$types';
  import { healthMessages } from './messages';

  let { data }: PageProps = $props();
  let m = $derived(healthMessages(data.locale));
  let preferences = $derived(preferenceMessages(data.locale));
  let format = $derived(
    new Intl.DateTimeFormat(data.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
      hourCycle: 'h23',
    }),
  );
  let size = $derived(
    new Intl.NumberFormat(data.locale, {
      style: 'unit',
      unit: 'megabyte',
      maximumFractionDigits: 2,
    }),
  );
  function date(seconds: number | null) {
    return seconds === null
      ? m.unknown
      : `${format.format(new Date(seconds * 1000))} UTC`;
  }
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>
<div class="max-w-2xl space-y-6">
  <header class="context-header space-y-2">
    <nav class="context-nav" aria-label={preferences.settings}>
      <a href="/admin/settings">{preferences.personal}</a>
      <a href="/admin/settings/security">
        {messagesFor(data.locale)['admin.security']}
      </a>
      <a href="/admin/settings/admins">
        {adminInviteMessages[data.locale].title}
      </a>
      <span aria-current="page">{m.title}</span>
    </nav>
    <h1 class="text-3xl font-semibold tracking-tight">{m.title}</h1>
    <p>{m.intro}</p>
  </header>
  <section class="context-panel space-y-4" aria-labelledby="storage-heading">
    <h2 id="storage-heading" class="text-xl font-semibold">{m.database}</h2>
    <p class="font-medium">
      {data.health.database.status === 'available'
        ? m.connected
        : m.unavailable}
    </p>
    {#if data.health.database.sizeBytes !== null}
      <p>{m.size}: {size.format(data.health.database.sizeBytes / 1_000_000)}</p>
    {/if}
    <a
      class="underline underline-offset-4"
      href="https://dash.cloudflare.com/?to=/:account/workers-and-pages"
    >
      {m.checkCloudflare}
    </a>
  </section>
  <section class="context-panel space-y-3" aria-labelledby="analytics-heading">
    <h2 id="analytics-heading" class="text-xl font-semibold">{m.analytics}</h2>
    <p class="font-medium">
      {data.health.analytics === 'available'
        ? m.connected
        : m[data.health.analytics]}
    </p>
  </section>
  <section class="context-panel space-y-3" aria-labelledby="clicks-heading">
    <h2 id="clicks-heading" class="text-xl font-semibold">{m.clicks}</h2>
    <p class="font-medium">{m[data.health.clicks.status]}</p>
    <dl class="space-y-2 text-sm">
      <div>
        <dt class="font-medium">{m.latest}</dt>
        <dd>{data.health.clicks.latestDay ?? m.unknown}</dd>
      </div>
      <div>
        <dt class="font-medium">{m.completed}</dt>
        <dd>{date(data.health.clicks.completedAt)}</dd>
      </div>
      {#if data.health.clicks.missingDays.length}
        <div>
          <dt class="font-medium">{m.missing}</dt>
          <dd class="break-words">
            {data.health.clicks.missingDays.join(', ')}
          </dd>
        </div>
      {/if}
    </dl>
    <a
      class="underline underline-offset-4"
      href="/admin/analytics#click-history-recovery"
    >
      {m.recovery}
    </a>
  </section>
  <section
    class="context-panel space-y-3"
    aria-labelledby="conversions-heading"
  >
    <h2 id="conversions-heading" class="text-xl font-semibold">
      {m.conversions}
    </h2>
    <p class="font-medium">{m[data.health.conversions.status]}</p>
    {#if data.health.conversions.oldestDueAt !== null}
      <dl class="text-sm">
        <dt class="font-medium">{m.oldest}</dt>
        <dd>{date(data.health.conversions.oldestDueAt)}</dd>
      </dl>
    {/if}
  </section>
  {#if data.health.version}
    <section class="context-panel space-y-3" aria-labelledby="version-heading">
      <h2 id="version-heading" class="text-xl font-semibold">{m.version}</h2>
      <dl class="space-y-2 text-sm">
        <div>
          <dt class="font-medium">{m.deployment}</dt>
          <dd class="break-all">{data.health.version.id}</dd>
        </div>
        <div>
          <dt class="font-medium">{m.deployedAt}</dt>
          <dd>{format.format(new Date(data.health.version.timestamp))} UTC</dd>
        </div>
      </dl>
    </section>
  {/if}
</div>
