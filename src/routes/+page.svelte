<script lang="ts">
  import Brand from '$lib/components/Brand.svelte';
  import { locales, localeNames, messagesFor } from '$lib/i18n/locale';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let messages = $derived(messagesFor(data.locale));
</script>

<svelte:head>
  <title>Linkrovia</title>
  <meta name="description" content={messages['home.description']} />
</svelte:head>

<main class="landing">
  <header class="landing-bar">
    <Brand iconOnly />
    <a href="https://github.com/enjoydarts/linkrovia" class="landing-source">
      GitHub <span aria-hidden="true">↗</span>
    </a>
  </header>

  <section class="landing-panel">
    <div class="landing-copy">
      <h1>Linkrovia</h1>
      <p>{messages['home.description']}</p>
      <a class="landing-action" href={data.initialized ? '/login' : '/setup'}>
        {data.initialized ? messages['login.title'] : messages['setup.title']}
        <span aria-hidden="true">→</span>
      </a>
    </div>
    <div class="landing-preview" aria-hidden="true">
      <img src="/linkrovia-logo.png" alt="" width="240" height="240" />
    </div>
  </section>

  <form method="POST" class="landing-footer">
    <div class="space-y-1">
      <label for="locale" class="block text-sm font-medium">
        {messages['language.label']}
      </label>
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
      class="rounded-md border px-4 py-2 text-sm font-semibold"
      style:border-color="var(--line)"
    >
      {messages['language.save']}
    </button>
    {#if form?.invalidLocale}
      <p role="alert" class="w-full">{messages['language.invalid']}</p>
    {/if}
  </form>
</main>
