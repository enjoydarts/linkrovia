<script lang="ts">
  import type { Locale } from '$lib/i18n/locale';
  import { linkExtra, linkMessages } from '$lib/i18n/links';
  import { interpretLocalDateTime } from '$lib/timezone/timezone';

  type Domain = {
    id: string;
    hostname: string;
    isActive: boolean;
    connectionStatus: string;
  };
  type Link = {
    domainId: string;
    slug: string;
    destinationUrl: string;
    title: string | null;
    isActive: boolean;
    redirectType: number;
    startsAt: number | null;
    expiresAt: number | null;
    tags: string[];
    updatedAt: number;
  };
  let {
    locale,
    csrfToken,
    domains,
    link,
    timeZone,
    error,
    values,
    formAction,
  }: {
    locale: Locale;
    csrfToken: string;
    domains: Domain[];
    link: Link | null;
    timeZone: string;
    error?: string;
    formAction?: string;
    values?: {
      domainId: string;
      slug: string;
      destinationUrl: string;
      title: string;
      status: string;
      active: boolean;
      startsAt: string;
      expiresAt: string;
      tags: string;
      startFold: string;
      expiryFold: string;
      updatedAt: string;
    };
  } = $props();
  let m = $derived(linkMessages(locale));
  let x = $derived(linkExtra(locale));
  let redirectStatus = $derived(
    Number(values?.status ?? link?.redirectType ?? 302),
  );
  let permanent = $derived(redirectStatus === 301 || redirectStatus === 308);
  let startsAt = $derived(
    values?.startsAt ?? localTime(link?.startsAt ?? null),
  );
  let expiresAt = $derived(
    values?.expiresAt ?? localTime(link?.expiresAt ?? null),
  );
  let startFold = $derived(values?.startFold ?? savedFold(link?.startsAt));
  let expiryFold = $derived(values?.expiryFold ?? savedFold(link?.expiresAt));
  let startUtc = $derived(previewUtc(startsAt, startFold));
  let expiryUtc = $derived(previewUtc(expiresAt, expiryFold));
  let utcFormat = $derived(
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'medium',
      timeZone: 'UTC',
    }),
  );

  function localTime(value: number | null): string {
    if (value === null) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(value * 1000));
    const part = (name: string) =>
      parts.find((p) => p.type === name)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
  }

  function savedFold(value: number | null | undefined): string {
    if (value == null) return '';
    const time = interpretLocalDateTime(localTime(value), timeZone);
    if (time.kind !== 'overlap') return '';
    return time.earlier === value ? 'earlier' : 'later';
  }

  function previewUtc(value: string, fold: string): number | null {
    if (!value) return null;
    const time = interpretLocalDateTime(value, timeZone);
    if (time.kind === 'exact') return time.epochSeconds;
    if (time.kind === 'overlap' && (fold === 'earlier' || fold === 'later')) {
      return time[fold];
    }
    return null;
  }
</script>

{#snippet utcPreview(id: string, value: number | null)}
  <p {id} aria-live="polite" class="text-sm text-muted">
    {#if value !== null}
      {x.utcPreview} ·
      <time datetime={new Date(value * 1000).toISOString()}>
        {utcFormat.format(value * 1000)} UTC
      </time>
    {/if}
  </p>
{/snippet}

<form
  method="POST"
  action={formAction}
  class="max-w-3xl space-y-6 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-7"
>
  <input type="hidden" name="csrfToken" value={csrfToken} />
  {#if link}<input
      type="hidden"
      name="updatedAt"
      value={values?.updatedAt ?? link.updatedAt}
    />{/if}
  {#if error}<p
      role="alert"
      class="rounded-md border border-negative p-3 text-negative"
    >
      {error === 'conflict'
        ? m.conflict
        : error === 'time_gap'
          ? x.gap
          : error === 'time_overlap'
            ? x.overlap
            : error === 'slug_conflict'
              ? x.slugConflict
              : m.error}
    </p>{/if}
  <div class="space-y-2">
    <label for="destinationUrl" class="block font-medium">
      {m.destination}
    </label><input
      id="destinationUrl"
      name="destinationUrl"
      type="url"
      required
      value={values?.destinationUrl ?? link?.destinationUrl ?? ''}
      class="w-full rounded-md border border-control bg-surface px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  </div>
  <div class="space-y-2">
    <label for="title" class="block font-medium">{m.title}</label><input
      id="title"
      name="title"
      value={values?.title ?? link?.title ?? ''}
      class="w-full rounded-md border border-control bg-surface px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  </div>
  <div class="space-y-2">
    <label for="domainId" class="block font-medium">{m.domain}</label><select
      id="domainId"
      name="domainId"
      required
      class="w-full rounded-md border border-control bg-surface px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {#each domains as domain (domain.id)}<option
          value={domain.id}
          selected={domain.id ===
            (values?.domainId ?? link?.domainId ?? domains[0]?.id)}
        >
          {domain.hostname}{#if !domain.isActive}
            ({m.draft}){/if}
        </option>{/each}
    </select>
  </div>
  <div class="space-y-2">
    <label for="slug" class="block font-medium">{m.slug}</label><input
      id="slug"
      name="slug"
      value={values?.slug ?? link?.slug ?? ''}
      aria-describedby="slug-help"
      class="w-full rounded-md border border-control bg-surface px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
    <p id="slug-help" class="text-sm text-muted">
      {m.slugHelp}
    </p>
  </div>
  <div class="space-y-2">
    <label for="status" class="block font-medium">{m.redirect}</label><select
      id="status"
      name="status"
      bind:value={redirectStatus}
      aria-describedby={permanent ? 'redirect-cache-warning' : undefined}
      class="rounded-md border border-control bg-surface px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {#each [301, 302, 307, 308] as status (status)}<option value={status}>
          {status}
        </option>{/each}
    </select>
    {#if permanent}<p
        id="redirect-cache-warning"
        role="status"
        class="text-sm text-muted"
      >
        {x.permanentCache}
      </p>{/if}
  </div>
  <label class="flex items-center gap-2">
    <input
      type="checkbox"
      name="active"
      autocomplete="off"
      checked={values?.active ?? link?.isActive ?? true}
    />{m.enabled}
  </label>
  <fieldset
    class="space-y-4 rounded-xl border border-line bg-canvas/40 p-4 sm:p-5"
  >
    <legend class="px-1 font-medium">{m.timezone} {timeZone}</legend>
    <div class="space-y-2">
      <label for="startsAt" class="block font-medium">{m.startsAt}</label><input
        id="startsAt"
        name="startsAt"
        type="datetime-local"
        step="1"
        bind:value={startsAt}
        aria-describedby="startsAt-utc"
        class="w-full rounded-md border border-control bg-surface px-3 py-2"
      />
      <label for="startFold" class="block text-sm">
        {m.startsAt} — {x.fold}
      </label><select
        id="startFold"
        name="startFold"
        bind:value={startFold}
        class="rounded-md border border-control bg-surface px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="">{x.choose}</option><option value="earlier">
          {x.earlier}
        </option><option value="later">{x.later}</option>
      </select>
      {@render utcPreview('startsAt-utc', startUtc)}
    </div>
    <div class="space-y-2">
      <label for="expiresAt" class="block font-medium">
        {m.expiresAt}
      </label><input
        id="expiresAt"
        name="expiresAt"
        type="datetime-local"
        step="1"
        bind:value={expiresAt}
        aria-describedby="expiresAt-utc"
        class="w-full rounded-md border border-control bg-surface px-3 py-2"
      />
      <label for="expiryFold" class="block text-sm">
        {m.expiresAt} — {x.fold}
      </label><select
        id="expiryFold"
        name="expiryFold"
        bind:value={expiryFold}
        class="rounded-md border border-control bg-surface px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="">{x.choose}</option><option value="earlier">
          {x.earlier}
        </option><option value="later">{x.later}</option>
      </select>
      {@render utcPreview('expiresAt-utc', expiryUtc)}
    </div>
  </fieldset>
  <div class="space-y-2">
    <label for="tags" class="block font-medium">{m.tags}</label><input
      id="tags"
      name="tags"
      value={values?.tags ?? link?.tags.join(', ') ?? ''}
      aria-describedby="tags-help"
      class="w-full rounded-md border border-control bg-surface px-3 py-2 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
    <p id="tags-help" class="text-sm text-muted">
      {m.tagsHelp}
    </p>
  </div>
  <button
    type="submit"
    class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
  >
    {m.save}
  </button>
</form>
