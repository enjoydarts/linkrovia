<script lang="ts">
  import { brand } from '$lib/brand';
  import { enhance } from '$app/forms';
  import { messagesFor } from '$lib/i18n/locale';
  import AuthFrame from '$lib/components/auth/AuthFrame.svelte';
  import PasskeyForm from '$lib/components/auth/PasskeyForm.svelte';
  import TurnstileWidget from '$lib/components/security/TurnstileWidget.svelte';
  import { domainOperationMessages } from '../admin/domains/messages';
  import { setupDomainMessages } from './messages';
  import type { PageProps, SubmitFunction } from './$types';

  let { data, form }: PageProps = $props();
  let connecting = $state(false);
  let messages = $derived(messagesFor(data.locale));
  let domainMessages = $derived(setupDomainMessages[data.locale]);
  let cloudflareMessages = $derived(domainOperationMessages(data.locale));
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
      case 'operation_unknown':
        return domainMessages.operationUnknown;
      default:
        return form?.code
          ? (cloudflareMessages[form.code] ?? messages['error.generic'])
          : '';
    }
  });
  const connectDomain: SubmitFunction = ({ cancel, formElement }) => {
    if (connecting) {
      cancel();
      return;
    }
    connecting = true;
    return async ({ update }) => {
      try {
        await update({ reset: false });
      } finally {
        const token = formElement.elements.namedItem('token');
        if (token instanceof HTMLInputElement) token.value = '';
        connecting = false;
      }
    };
  };
</script>

<svelte:head>
  <title>{messages['setup.title']} · {brand.name}</title>
</svelte:head>
<AuthFrame
  title={messages['setup.title']}
  description={messages['setup.subtitle']}
>
  <div class="space-y-8">
    {#if data.step === 'token'}
      <section class="space-y-5">
        <h2 class="text-xl font-semibold">{messages['setup.step1']}</h2>
        <p class="leading-relaxed">{messages['setup.tokenHelp']}</p>
        <a
          class="inline-block text-link underline underline-offset-4"
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
              class="w-full rounded-md border border-control bg-surface px-3 py-2"
            />
          </div>
          {#if data.turnstile}<TurnstileWidget
              siteKey={data.turnstile.siteKey}
              action="setup"
              locale={data.locale}
            />{/if}
          {#if errorMessage}<p role="alert" class="text-negative">
              {errorMessage}
            </p>{/if}
          <button
            class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
            type="submit"
          >
            {messages['setup.verify']}
          </button>
        </form>
      </section>
    {:else if data.step === 'management'}
      <section class="space-y-5">
        <h2 class="text-xl font-semibold">{domainMessages.heading}</h2>
        <p>{domainMessages.purpose}</p>
        {#if errorMessage}<p role="alert" class="text-negative">
            {errorMessage}
          </p>{/if}
        {#if data.customSetupUrl}
          <p>{domainMessages.waiting}</p>
          <a
            href={data.customSetupUrl}
            class="block break-all text-link underline underline-offset-4"
          >
            {domainMessages.continue}
            <span class="block text-sm">{data.customSetupUrl}</span>
          </a>
        {:else if data.customAvailable}
          <p>{domainMessages.custom}</p>
          <p>
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              class="text-link underline underline-offset-4"
            >
              {cloudflareMessages.tokenLink} ↗
            </a>
          </p>
          <p>{cloudflareMessages.scopes}</p>
          <form
            method="POST"
            action="?/connectDomain"
            use:enhance={connectDomain}
            class="space-y-4"
            aria-busy={connecting}
          >
            <div class="space-y-2">
              <label for="managementHostname" class="block font-medium">
                {domainMessages.hostname}
              </label>
              <input
                id="managementHostname"
                name="hostname"
                required
                spellcheck="false"
                autocapitalize="none"
                placeholder="admin.example.com"
                class="w-full rounded-md border border-control bg-surface px-3 py-2"
              />
            </div>
            <div class="space-y-2">
              <label for="cloudflareToken" class="block font-medium">
                {domainMessages.token}
              </label>
              <input
                id="cloudflareToken"
                name="token"
                type="password"
                required
                autocomplete="off"
                class="w-full rounded-md border border-control bg-surface px-3 py-2"
              />
            </div>
            <label class="flex items-start gap-2">
              <input type="checkbox" name="confirmed" required class="mt-1" />
              <span>{domainMessages.confirm}</span>
            </label>
            <button
              type="submit"
              disabled={connecting}
              class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
            >
              {domainMessages.connect}
            </button>
            <p role="status">{connecting ? domainMessages.connecting : ''}</p>
          </form>
        {/if}
        <form method="POST" action="?/useDeployment" class="space-y-3">
          <p>{domainMessages.fallback}</p>
          <p class="break-all font-medium">{data.hostname}</p>
          <button
            type="submit"
            class="rounded-md border border-control bg-surface px-4 py-2 font-medium"
          >
            {domainMessages.useCurrent}
          </button>
        </form>
      </section>
    {:else if data.step === 'owner'}
      <section class="space-y-5">
        <h2 class="text-xl font-semibold">{messages['setup.step2']}</h2>
        {#if data.passkeyAvailable}<PasskeyForm
            mode="setup"
            locale={data.locale}
          />{/if}
        {#if data.passwordAvailable}
          <details open={!data.passkeyAvailable} class="space-y-5">
            <summary class="cursor-pointer font-medium">
              {messages['passkey.password']}
            </summary>
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
                  class="w-full rounded-md border border-control bg-surface px-3 py-2"
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
                  class="w-full rounded-md border border-control bg-surface px-3 py-2"
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
                  class="w-full rounded-md border border-control bg-surface px-3 py-2"
                />
              </div>
              {#if errorMessage}<p role="alert" class="text-negative">
                  {errorMessage}
                </p>{/if}
              <button
                class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
                type="submit"
              >
                {messages['setup.register']}
              </button>
            </form>
          </details>
        {:else if !data.passkeyAvailable}<p role="alert">
            {messages['passkey.noMethods']}
          </p>{/if}
      </section>
    {:else}
      <p>{messages['setup.configuration']}</p>
      <a href="/login" class="text-link underline underline-offset-4">
        {messages['login.title']}
      </a>
    {/if}
  </div>
</AuthFrame>
