<script lang="ts">
  import { locales, localeNames, messagesFor } from '$lib/i18n/locale';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let messages = $derived(messagesFor(data.locale));
</script>

<svelte:head>
  <title>Linkrovia</title>
  <meta name="description" content={messages['home.description']} />
</svelte:head>

<main
  class="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-6 py-12"
>
  <div class="space-y-3">
    <h1 class="text-4xl font-semibold tracking-tight">Linkrovia</h1>
    <p class="text-lg">{messages['home.description']}</p>
    <p>{messages['home.status']}</p>
  </div>

  <form method="POST" class="flex flex-wrap items-end gap-3">
    <div class="space-y-1">
      <label for="locale" class="block text-sm font-medium"
        >{messages['language.label']}</label
      >
      <select id="locale" name="locale" class="rounded-md border px-3 py-2">
        {#each locales as locale (locale)}
          <option
            value={locale}
            lang={locale}
            selected={locale === data.locale}
          >
            {localeNames[locale]}
          </option>
        {/each}
      </select>
    </div>
    <button
      type="submit"
      class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white"
    >
      {messages['language.save']}
    </button>
    {#if form?.invalidLocale}
      <p role="alert" class="w-full">{messages['language.invalid']}</p>
    {/if}
  </form>
</main>
