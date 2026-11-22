<script lang="ts">
  import { brand } from '$lib/brand';
  import { locales, localeNames } from '$lib/i18n/locale';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import { themes } from '$lib/theme/theme';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(preferenceMessages(data.locale));
</script>

<svelte:head><title>{m.personal} · {brand.name}</title></svelte:head>
<div class="max-w-2xl space-y-8">
  <header class="space-y-2">
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
    {#each data.timeZones as zone (zone)}<option value={zone}></option>{/each}
  </datalist>
  <form
    method="POST"
    action="?/personal"
    class="space-y-5 rounded-lg border border-line bg-surface p-5"
  >
    <input type="hidden" name="csrfToken" value={data.csrfToken} />
    <div class="space-y-2">
      <label for="locale" class="block font-medium">{m.language}</label><select
        id="locale"
        name="locale"
        class="w-full rounded-md border border-control bg-surface px-3 py-2"
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
        value={data.userZone}
        aria-describedby="user-zone-help"
        autocomplete="off"
        class="w-full rounded-md border border-control bg-surface px-3 py-2"
      />
      <p id="user-zone-help" class="text-sm text-muted">
        {m.userHelp}
      </p>
    </div>
    <div class="space-y-2">
      <label for="theme" class="block font-medium">{m.appearance}</label>
      <select
        id="theme"
        name="theme"
        class="w-full rounded-md border border-control bg-surface px-3 py-2"
      >
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
    <button
      type="submit"
      class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
    >
      {m.save}
    </button>
  </form>
  {#if data.isOwner}<form
      method="POST"
      action="?/defaultZone"
      class="space-y-5 rounded-lg border border-line bg-surface p-5"
    >
      <input type="hidden" name="csrfToken" value={data.csrfToken} />
      <div class="space-y-2">
        <label for="default-timezone" class="block font-medium">
          {m.defaultZone}
        </label><input
          id="default-timezone"
          name="timezone"
          type="text"
          required
          list="time-zones"
          value={data.defaultZone}
          aria-describedby="default-zone-help"
          autocomplete="off"
          class="w-full rounded-md border border-control bg-surface px-3 py-2"
        />
        <p id="default-zone-help" class="text-sm text-muted">
          {m.defaultHelp}
        </p>
      </div>
      {#if form?.section === 'global'}<p role="alert" class="text-negative">
          {m.invalidZone}
        </p>{/if}
      <button
        type="submit"
        class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
      >
        {m.save}
      </button>
    </form>{/if}
</div>
