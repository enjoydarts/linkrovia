<script lang="ts">
  import { brand } from '$lib/brand';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import '../../admin-context.css';
  import { resolve } from '$app/paths';
  import TurnstileWidget from '$lib/components/security/TurnstileWidget.svelte';
  import type { PageProps } from './$types';
  import { securityMessages } from './messages';

  let { data, form }: PageProps = $props();
  let messages = $derived(securityMessages(data.locale));
  let configurationIssue = $derived(
    data.status === 'ready' || data.status === 'test' ? undefined : data.status,
  );
</script>

<svelte:head>
  <title>{messages.title} · {brand.name}</title>
</svelte:head>

<div class="max-w-2xl space-y-6">
  <header class="context-header space-y-2">
    <nav
      class="context-nav"
      aria-label={preferenceMessages(data.locale).settings}
    >
      <a href="/admin/settings">
        {preferenceMessages(data.locale).personal}
      </a><span aria-current="page">{messages.title}</span>
    </nav>
    <h1 class="text-3xl font-semibold tracking-tight">{messages.title}</h1>
    <p>{messages.intro}</p>
  </header>

  <dl class="context-panel space-y-2 rounded-md border border-line p-4 text-sm">
    <div class="flex flex-wrap gap-x-3">
      <dt class="font-medium">{messages.status}</dt>
      <dd>
        {data.enabled
          ? configurationIssue
            ? messages.incomplete
            : messages.enabled
          : messages.disabled}
      </dd>
    </div>
    <div class="flex flex-wrap gap-x-3">
      <dt class="font-medium">{messages.hostname}</dt>
      <dd><code>{data.hostname}</code></dd>
    </div>
  </dl>

  {#if form?.error}
    <p role="alert" class="font-medium">{messages[form.error]}</p>
  {:else if data.enabled && configurationIssue}
    <p role="alert" class="font-medium">{messages[configurationIssue]}</p>
  {:else if form?.saved}
    <p role="status" class="font-medium">
      {form.saved === 'enabled' ? messages.saved : messages.turnedOff}
    </p>
  {/if}

  {#if form?.reviewSiteKey}
    <form method="POST" action="?/enable" class="context-panel space-y-3">
      <input type="hidden" name="csrfToken" value={data.csrfToken} />
      <input type="hidden" name="siteKey" value={form.reviewSiteKey} />
      <p>{messages.verify}</p>
      <TurnstileWidget
        siteKey={form.reviewSiteKey}
        action="security_settings"
        locale={data.locale}
      />
      <div class="flex flex-wrap items-center gap-4">
        <button type="submit" class="admin-button admin-button-primary">
          {data.enabled ? messages.verifySave : messages.verifyEnable}
        </button>
        <a
          href={resolve('/admin/settings/security')}
          data-sveltekit-reload
          class="text-sm underline underline-offset-4"
        >
          {messages.edit}
        </a>
      </div>
    </form>
  {:else}
    <ol class="list-decimal space-y-4 pl-5">
      <li class="space-y-1">
        <a
          class="font-medium underline underline-offset-4"
          href="https://dash.cloudflare.com/?to=/:account/turnstile"
        >
          {messages.manageWidget}
        </a>
        <p>{messages.widgetSetup}</p>
      </li>
      <li class="space-y-1">
        <a
          class="font-medium underline underline-offset-4"
          href="https://dash.cloudflare.com/?to=/:account/workers-and-pages"
        >
          {messages.manageWorker}
        </a>
        <p>{messages.secretSetup}</p>
      </li>
    </ol>

    <form method="POST" action="?/prepare" class="context-panel space-y-3">
      <input type="hidden" name="csrfToken" value={data.csrfToken} />
      <div class="space-y-1">
        <label for="site-key" class="block font-medium">
          {messages.siteKey}
        </label>
        <input
          id="site-key"
          name="siteKey"
          value={data.siteKey}
          maxlength="32"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          required
          aria-describedby="site-key-hint"
          class="admin-control w-full font-mono sm:max-w-sm"
        />
        <p id="site-key-hint" class="text-sm">{messages.siteKeyHint}</p>
      </div>
      <button type="submit" class="admin-button admin-button-primary">
        {messages.prepare}
      </button>
    </form>
  {/if}

  {#if data.enabled}
    <div class="space-y-3 border-t border-line pt-4">
      <p class="text-sm">{messages.rotate}</p>
      <form method="POST" action="?/disable">
        <input type="hidden" name="csrfToken" value={data.csrfToken} />
        <button type="submit" class="admin-button">
          {messages.disable}
        </button>
      </form>
    </div>
  {/if}
</div>
