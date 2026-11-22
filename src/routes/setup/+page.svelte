<script lang="ts">
  import { messagesFor } from '$lib/i18n/locale';
  import TurnstileWidget from '$lib/components/security/TurnstileWidget.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let messages = $derived(messagesFor(data.locale));
  let errorMessage = $derived.by(() => {
    switch (form?.code) {
      case 'invalid_token':
        return messages['error.invalid_token'];
      case 'invalid_input':
        return messages['error.invalid_input'];
      case 'unavailable':
        return messages['error.unavailable'];
      case 'rate_limit':
        return messages['error.rate_limit'];
      case 'turnstile':
        return messages['error.turnstile'];
      case 'csrf':
        return messages['error.csrf'];
      default:
        return form?.code ? messages['error.generic'] : '';
    }
  });
</script>

<svelte:head><title>{messages['setup.title']} · Linkrovia</title></svelte:head>
<main
  class="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12"
>
  <div class="space-y-8">
    <header class="space-y-2">
      <p
        class="text-sm font-semibold tracking-wide text-blue-700 dark:text-blue-400"
      >
        Linkrovia
      </p>
      <h1 class="text-3xl font-semibold tracking-tight">
        {messages['setup.title']}
      </h1>
      <p class="text-neutral-600 dark:text-neutral-300">
        {messages['setup.subtitle']}
      </p>
    </header>
    {#if data.step === 'token'}
      <section class="space-y-5">
        <h2 class="text-xl font-semibold">{messages['setup.step1']}</h2>
        <p class="leading-relaxed">{messages['setup.tokenHelp']}</p>
        <a
          class="inline-block text-blue-700 underline underline-offset-4 dark:text-blue-400"
          href="https://dash.cloudflare.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {messages['setup.dashboard']} ↗
        </a>
        <form method="POST" action="?/verify" class="space-y-5">
          <div class="space-y-2">
            <label for="setupToken" class="block font-medium">
              {messages['setup.tokenLabel']}
            </label><input
              id="setupToken"
              name="setupToken"
              type="password"
              required
              autocomplete="off"
              class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
            />
          </div>
          {#if data.turnstile}<TurnstileWidget
              siteKey={data.turnstile.siteKey}
              action="setup"
              locale={data.locale}
            />{/if}
          {#if errorMessage}<p
              role="alert"
              class="text-red-700 dark:text-red-400"
            >
              {errorMessage}
            </p>{/if}
          <button
            class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
            type="submit"
          >
            {messages['setup.verify']}
          </button>
        </form>
      </section>
    {:else if data.step === 'owner'}
      <section class="space-y-5">
        <h2 class="text-xl font-semibold">{messages['setup.step2']}</h2>
        <p>{messages['setup.ownerHelp']}</p>
        <form method="POST" action="?/register" class="space-y-5">
          <div class="space-y-2">
            <label for="email" class="block font-medium">
              {messages['auth.email']}
            </label><input
              id="email"
              name="email"
              type="email"
              required
              autocomplete="email"
              class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
            />
          </div>
          <div class="space-y-2">
            <label for="password" class="block font-medium">
              {messages['auth.password']}
            </label><input
              id="password"
              name="password"
              type="password"
              required
              autocomplete="new-password"
              class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
            />
          </div>
          <div class="space-y-2">
            <label for="confirmPassword" class="block font-medium">
              {messages['auth.confirmPassword']}
            </label><input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autocomplete="new-password"
              class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
            />
          </div>
          {#if errorMessage}<p
              role="alert"
              class="text-red-700 dark:text-red-400"
            >
              {errorMessage}
            </p>{/if}
          <button
            class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
            type="submit"
          >
            {messages['setup.register']}
          </button>
        </form>
      </section>
    {:else}
      <p>{messages['setup.configuration']}</p>
      <a
        href="/login"
        class="text-blue-700 underline underline-offset-4 dark:text-blue-400"
      >
        {messages['login.title']}
      </a>
    {/if}
  </div>
</main>
