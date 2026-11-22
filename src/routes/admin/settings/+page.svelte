<script lang="ts">
  import { locales, localeNames } from '$lib/i18n/locale';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(preferenceMessages(data.locale));
</script>

<svelte:head><title>{m.regional} · Linkrovia</title></svelte:head>
<div class="max-w-2xl space-y-8">
  <header class="space-y-2">
    <h1 class="text-3xl font-semibold tracking-tight">{m.regional}</h1>
    <p>{m.intro}</p>
    <p class="text-sm text-neutral-600 dark:text-neutral-300">
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
    class="space-y-5 rounded-lg border border-neutral-300 p-5 dark:border-neutral-700"
  >
    <input type="hidden" name="csrfToken" value={data.csrfToken} />
    <div class="space-y-2">
      <label for="locale" class="block font-medium">{m.language}</label><select
        id="locale"
        name="locale"
        class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
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
        class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
      />
      <p
        id="user-zone-help"
        class="text-sm text-neutral-600 dark:text-neutral-300"
      >
        {m.userHelp}
      </p>
    </div>
    {#if form?.section === 'personal'}<p
        role="alert"
        class="text-red-700 dark:text-red-400"
      >
        {m.invalid}
      </p>{/if}
    <button
      type="submit"
      class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
    >
      {m.save}
    </button>
  </form>
  {#if data.isOwner}<form
      method="POST"
      action="?/defaultZone"
      class="space-y-5 rounded-lg border border-neutral-300 p-5 dark:border-neutral-700"
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
          class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
        />
        <p
          id="default-zone-help"
          class="text-sm text-neutral-600 dark:text-neutral-300"
        >
          {m.defaultHelp}
        </p>
      </div>
      {#if form?.section === 'global'}<p
          role="alert"
          class="text-red-700 dark:text-red-400"
        >
          {m.invalid}
        </p>{/if}
      <button
        type="submit"
        class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
      >
        {m.save}
      </button>
    </form>{/if}
</div>
