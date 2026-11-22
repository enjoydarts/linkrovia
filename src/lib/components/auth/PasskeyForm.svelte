<script lang="ts">
  import { onMount } from 'svelte';
  import type { Locale } from '$lib/i18n/locale';
  import { messagesFor } from '$lib/i18n/locale';
  import TurnstileWidget from '$lib/components/security/TurnstileWidget.svelte';
  import type {
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
  } from '@simplewebauthn/browser';

  let {
    mode,
    locale,
    turnstile = null,
  }: {
    mode: 'setup' | 'login';
    locale: Locale;
    turnstile?: { siteKey: string } | null;
  } = $props();
  let messages = $derived(messagesFor(locale));
  let busy = $state(false);
  let hydrated = $state(false);
  onMount(() => {
    hydrated = true;
  });
  let issue = $state('');
  let resetKey = $state(0);

  function errorText(code: string): string {
    switch (code) {
      case 'csrf':
        return messages['error.csrf'];
      case 'unavailable':
        return messages['error.unavailable'];
      case 'rate_limit':
        return messages['error.rate_limit'];
      case 'invalid_input':
        return messages['error.invalid_input'];
      case 'invalid_token':
        return messages['error.invalid_token'];
      case 'turnstile':
        return messages['error.turnstile'];
      case 'invalid_credentials':
        return messages['error.invalid_credentials'];
      default:
        return messages['passkey.cancelled'];
    }
  }
  async function post(
    body: object,
  ): Promise<{ options?: unknown; redirect?: string }> {
    const response = await fetch(`/${mode}/passkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    const result = (await response.json()) as {
      code?: string;
      options?: unknown;
      redirect?: string;
    };
    if (!response.ok) throw new Error(result.code || 'error');
    return result;
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    if (!window.isSecureContext || !window.PublicKeyCredential) {
      issue = messages['passkey.unavailable'];
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const fields = new FormData(form);
    busy = true;
    issue = '';
    try {
      const token = fields.get('cf-turnstile-response');
      const begin = await post(
        mode === 'setup'
          ? { step: 'begin', email: fields.get('email') }
          : {
              step: 'begin',
              turnstileToken: typeof token === 'string' ? token : undefined,
            },
      );
      if (!begin.options) throw new Error('unavailable');
      const browser = await import('@simplewebauthn/browser');
      const response =
        mode === 'setup'
          ? await browser.startRegistration({
              optionsJSON:
                begin.options as PublicKeyCredentialCreationOptionsJSON,
            })
          : await browser.startAuthentication({
              optionsJSON:
                begin.options as PublicKeyCredentialRequestOptionsJSON,
            });
      const finish = await post({ step: 'finish', response });
      if (finish.redirect !== '/admin') throw new Error('unavailable');
      window.location.assign('/admin');
    } catch (error) {
      issue = errorText(error instanceof Error ? error.message : 'error');
      resetKey += 1;
    } finally {
      busy = false;
    }
  }
</script>

<form
  method="POST"
  action="/{mode}/passkey"
  onsubmit={submit}
  class="space-y-5"
>
  <p>
    {mode === 'setup'
      ? messages['passkey.createHelp']
      : messages['passkey.loginHelp']}
  </p>
  {#if mode === 'setup'}<div class="space-y-2">
      <label for="passkey-email" class="block font-medium">
        {messages['auth.email']}
      </label><input
        id="passkey-email"
        name="email"
        type="email"
        required
        autocomplete="email"
        class="w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2"
      />
    </div>{/if}
  {#if mode === 'login' && turnstile}<TurnstileWidget
      siteKey={turnstile.siteKey}
      action="login"
      {locale}
      {resetKey}
    />{/if}
  {#if issue}<p role="alert" class="text-red-700 dark:text-red-400">
      {issue}
    </p>{/if}
  <button
    type="submit"
    disabled={busy || !hydrated}
    class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
  >
    {busy
      ? messages['passkey.busy']
      : mode === 'setup'
        ? messages['passkey.create']
        : messages['passkey.login']}
  </button>
  <noscript><p>{messages['passkey.javascript']}</p></noscript>
</form>
