<script lang="ts">
  import { adminInviteMessages } from '$lib/i18n/admin-invites';
  import { healthMessages } from './health/messages';
  import { brand } from '$lib/brand';
  import { messagesFor } from '$lib/i18n/locale';
  import '../admin-context.css';
  import { locales, localeNames } from '$lib/i18n/locale';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import { themes } from '$lib/theme/theme';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(preferenceMessages(data.locale));
  let userZone = $derived(data.userZone);
  let defaultZone = $derived(data.defaultZone);
  const scopeLabels = {
    en: ['Personal preferences', 'Instance defaults'],
    ja: ['個人の設定', '導入先全体の既定値'],
    'zh-CN': ['个人偏好', '实例默认设置'],
    'zh-TW': ['個人偏好', '執行個體預設設定'],
    es: ['Preferencias personales', 'Valores predeterminados de la instancia'],
    it: ['Preferenze personali', 'Impostazioni predefinite dell’istanza'],
    fr: ['Préférences personnelles', 'Valeurs par défaut de l’instance'],
  } as const;
  let scopes = $derived(scopeLabels[data.locale]);

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

<svelte:head><title>{m.personal} · {brand.name}</title></svelte:head>
<div class="max-w-2xl space-y-8">
  <header class="context-header space-y-2">
    <nav class="context-nav" aria-label={m.settings}>
      <span aria-current="page">{m.personal}</span><a
        href="/admin/settings/security"
      >
        {messagesFor(data.locale)['admin.security']}
      </a>
      {#if data.isOwner}
        <a href="/admin/settings/health">{healthMessages(data.locale).title}</a>
        <a href="/admin/settings/admins">
          {adminInviteMessages[data.locale].title}
        </a>
      {/if}
    </nav>
    <h1 class="text-3xl font-semibold tracking-tight">{m.personal}</h1>
    <p>{m.intro}</p>
    <p class="text-sm text-muted">
      {m.effective}: {data.timeZone}
    </p>
  </header>
  {#if data.saved === 'personal'}<p role="status">
      {m.saved}
    </p>{:else if data.saved === 'global'}<p role="status">
      {m.globalSaved}
    </p>{/if}
  <datalist id="time-zones">
    {#each data.timeZones as zone (zone)}<option
        value={zone}
        label={zone.replaceAll('_', ' ').replaceAll('/', ' · ')}
      ></option>{/each}
  </datalist>
  <form
    method="POST"
    action="?/personal"
    class="context-panel space-y-5 rounded-lg border border-line bg-surface p-5"
  >
    <input type="hidden" name="csrfToken" value={data.csrfToken} />
    <h2 class="text-lg font-semibold">{scopes[0]}</h2>
    <div class="space-y-2">
      <label for="locale" class="block font-medium">{m.language}</label><select
        id="locale"
        name="locale"
        class="admin-control w-full"
      >
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
      <label for="timezone" class="block font-medium">{m.userZone}</label><input
        id="timezone"
        name="timezone"
        type="text"
        list="time-zones"
        bind:value={userZone}
        aria-describedby="user-zone-help user-zone-example"
        autocomplete="off"
        class="admin-control w-full"
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
    {#if form?.section === 'personal'}<p role="alert" class="text-negative">
        {m.invalid}
      </p>{/if}
    <button type="submit" class="admin-button admin-button-primary">
      {m.save}
    </button>
  </form>
  {#if data.isOwner}<form
      method="POST"
      action="?/defaultZone"
      class="context-panel space-y-5 rounded-lg border border-line bg-surface p-5"
    >
      <input type="hidden" name="csrfToken" value={data.csrfToken} />
      <h2 class="text-lg font-semibold">{scopes[1]}</h2>
      <div class="space-y-2">
        <label for="default-timezone" class="block font-medium">
          {m.defaultZone}
        </label><input
          id="default-timezone"
          name="timezone"
          type="text"
          required
          list="time-zones"
          bind:value={defaultZone}
          aria-describedby="default-zone-help default-zone-example"
          autocomplete="off"
          class="admin-control w-full"
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
      {#if form?.section === 'global'}<p role="alert" class="text-negative">
          {m.invalidZone}
        </p>{/if}
      <button type="submit" class="admin-button admin-button-primary">
        {m.save}
      </button>
    </form>{/if}
</div>
