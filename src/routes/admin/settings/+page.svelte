<script lang="ts">
  import { adminInviteMessages } from '$lib/i18n/admin-invites';
  import { apiKeyMessages } from '../api-keys/messages';
  import { backupMessages } from '../backup/messages';
  import { domainMessages } from '../domains/messages';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import { healthMessages } from './health/messages';
  import { brand } from '$lib/brand';
  import { messagesFor, uiMessages } from '$lib/i18n/locale';
  import '../admin-context.css';
  import { locales, localeNames } from '$lib/i18n/locale';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import { themes } from '$lib/theme/theme';
  import type { PageProps } from './$types';
  import TimeZoneInput from '$lib/components/settings/TimeZoneInput.svelte';
  let { data, form }: PageProps = $props();
  let m = $derived(preferenceMessages(data.locale));
  let userZone = $derived(data.userZone);
  let defaultZone = $derived(data.defaultZone);
  let settingsGroups = $derived(uiMessages(data.locale).settingsGroups);
  let directories = $derived([
    {
      label: settingsGroups.access,
      entries: [
        { href: '/admin/api-keys', label: apiKeyMessages(data.locale).title },
        ...(data.isOwner
          ? [
              {
                href: '/admin/settings/security',
                label: messagesFor(data.locale)['admin.security'],
              },
              {
                href: '/admin/settings/admins',
                label: adminInviteMessages[data.locale].title,
              },
              { href: '/admin/integrations/mcp', label: 'MCP' },
            ]
          : []),
      ],
    },
    {
      label: settingsGroups.operations,
      entries: [
        {
          href: '/admin/settings/ai',
          label: uiMessages(data.locale).aiInsights.settings,
        },
        { href: '/admin/domains', label: domainMessages(data.locale).domains },
        ...(data.isOwner
          ? [
              {
                href: '/admin/settings/health',
                label: healthMessages(data.locale).title,
              },
              {
                href: '/admin/backup',
                label: backupMessages(data.locale).title,
              },
            ]
          : []),
      ],
    },
  ]);

  function zoneExamples(zone: string) {
    if (!data.timeZones.includes(zone)) return [];
    try {
      const format = new Intl.DateTimeFormat(data.locale, {
        timeZone: zone,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'shortOffset',
      });
      const example = new Date(data.previewAt);
      const year = example.getUTCFullYear();
      const january = Date.UTC(year, 0, 15, 12);
      const july = Date.UTC(year, 6, 15, 12);
      const offset = (date: number) =>
        format.formatToParts(date).find(({ type }) => type === 'timeZoneName')
          ?.value;
      return offset(january) === offset(july)
        ? [format.format(example)]
        : [format.format(example), format.format(january), format.format(july)];
    } catch {
      return [];
    }
  }
</script>

<svelte:head><title>{m.settings} · {brand.name}</title></svelte:head>
<div class="admin-page">
  <header class="context-header">
    <h1>{m.settings}</h1>
  </header>
  <div class="admin-section-stack">
    <form
      id="personal-preferences"
      aria-labelledby="personal-preferences-heading"
      method="POST"
      action="?/personal"
      class="context-panel scroll-mt-24 space-y-5"
    >
      <input type="hidden" name="csrfToken" value={data.csrfToken} />
      <div class="admin-section-header">
        <h2 id="personal-preferences-heading">
          {settingsGroups.personal}
        </h2>
        <p class="text-sm text-muted">{m.intro}</p>
      </div>
      <p class="text-sm text-muted">{m.effective}: {data.timeZone}</p>
      <div class="space-y-2">
        <label for="locale" class="block font-medium">
          {m.language}
        </label><select id="locale" name="locale" class="admin-control w-full">
          {#each locales as locale (locale)}<option
              value={locale}
              lang={locale}
              selected={locale === data.locale}
            >
              {localeNames[locale]}
            </option>{/each}
        </select>
      </div>
      <div class="space-y-2">
        <label for="timezone" class="block font-medium">
          {m.userZone}
        </label><TimeZoneInput
          id="timezone"
          name="timezone"
          zones={data.timeZones}
          bind:value={userZone}
          describedby="user-zone-help user-zone-example"
        />
        <p id="user-zone-help" class="text-sm text-muted">
          {m.userHelp}
        </p>
        <p
          id="user-zone-example"
          class="text-sm text-muted tabular-nums"
          aria-live="polite"
        >
          {zoneExamples(userZone || data.defaultZone).join(' · ')}
        </p>
      </div>
      <div class="space-y-2">
        <label for="theme" class="block font-medium">{m.appearance}</label>
        <select id="theme" name="theme" class="admin-control w-full">
          {#each themes as theme (theme)}
            <option value={theme} selected={theme === data.theme}>
              {m[`${theme}Theme`]}
            </option>
          {/each}
        </select>
      </div>
      <div class="admin-form-footer">
        {#if form?.section === 'personal'}
          <p role="alert" class="text-negative">{m.invalid}</p>
        {:else if data.saved === 'personal'}
          <p role="status">{m.saved}</p>
        {/if}
        <button type="submit" class="admin-button admin-button-primary">
          {m.save}
        </button>
      </div>
    </form>
    {#if data.isOwner}<form
        method="POST"
        action="?/defaultZone"
        aria-labelledby="instance-defaults-heading"
        class="context-panel space-y-5"
      >
        <input type="hidden" name="csrfToken" value={data.csrfToken} />
        <div class="admin-section-header">
          <h2 id="instance-defaults-heading">{settingsGroups.defaults}</h2>
        </div>
        <div class="space-y-2">
          <label for="default-timezone" class="block font-medium">
            {m.defaultZone}
          </label><TimeZoneInput
            id="default-timezone"
            name="timezone"
            required
            zones={data.timeZones}
            bind:value={defaultZone}
            describedby="default-zone-help default-zone-example"
          />
          <p id="default-zone-help" class="text-sm text-muted">
            {m.defaultHelp}
          </p>
          <p
            id="default-zone-example"
            class="text-sm text-muted tabular-nums"
            aria-live="polite"
          >
            {zoneExamples(defaultZone).join(' · ')}
          </p>
        </div>
        <div class="space-y-2">
          <label for="default-locale" class="block font-medium">
            {m.defaultLanguage}
          </label>
          <select
            id="default-locale"
            name="defaultLocale"
            aria-describedby="default-locale-help"
            class="admin-control w-full"
          >
            {#each locales as locale (locale)}<option
                value={locale}
                lang={locale}
                selected={locale === data.defaultLocale}
              >
                {localeNames[locale]}
              </option>{/each}
          </select>
          <p id="default-locale-help" class="text-sm text-muted">
            {m.defaultLanguageHelp}
          </p>
        </div>
        <div class="admin-form-footer">
          {#if form?.section === 'global'}
            <p role="alert" class="text-negative">{m.invalidZone}</p>
          {:else if data.saved === 'global'}
            <p role="status">{m.globalSaved}</p>
          {/if}
          <button type="submit" class="admin-button admin-button-primary">
            {m.save}
          </button>
        </div>
      </form>{/if}
    <nav class="context-panel admin-section-stack" aria-label={m.settings}>
      {#each directories as directory (directory.label)}
        <section class="space-y-1" aria-label={directory.label}>
          <div class="admin-section-header">
            <h2>{directory.label}</h2>
          </div>
          <ul class="divide-y divide-line">
            {#each directory.entries as entry (entry.href)}
              <li>
                <a
                  href={entry.href}
                  class="flex items-center justify-between gap-4 min-h-11 py-2 font-medium text-link hover:underline"
                >
                  <span>{entry.label}</span>
                  <ArrowRight size={16} aria-hidden="true" class="shrink-0" />
                </a>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </nav>
  </div>
</div>
