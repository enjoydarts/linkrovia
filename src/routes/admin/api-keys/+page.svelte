<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';
  import { apiKeyMessages } from './messages';

  let { data, form }: PageProps = $props();
  let messages = $derived(apiKeyMessages(data.locale));
  let dateTime = $derived(
    new Intl.DateTimeFormat(data.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: data.timeZone,
    }),
  );
</script>

<svelte:head>
  <title>{messages.title} · Linkrovia</title>
</svelte:head>

<div class="max-w-2xl space-y-8">
  <header class="space-y-2">
    <h1 class="text-3xl font-semibold tracking-tight">{messages.title}</h1>
    <p>{messages.intro}</p>
  </header>

  {#if form?.newToken}
    <div
      class="space-y-2 rounded-md border border-neutral-400 p-4"
      role="status"
    >
      <p id="new-api-key" class="font-medium">{messages.created}</p>
      <input
        aria-labelledby="new-api-key"
        class="w-full rounded-md border px-3 py-2 font-mono text-sm"
        readonly
        value={form.newToken}
      />
    </div>
  {:else if form?.issue}
    <p role="alert" class="font-medium">{messages[form.issue]}</p>
  {:else if form?.revoked}
    <p role="status" class="font-medium">{messages.revokedNotice}</p>
  {/if}

  <form method="POST" action="?/create" use:enhance class="space-y-4">
    <input type="hidden" name="csrfToken" value={data.csrfToken} />
    <div class="space-y-1">
      <label for="key-name" class="block font-medium">{messages.name}</label>
      <input
        id="key-name"
        name="name"
        maxlength="80"
        required
        class="w-full rounded-md border px-3 py-2 sm:max-w-sm"
      />
    </div>
    <div class="space-y-1">
      <label for="key-expiry" class="block font-medium">
        {messages.expiry}
      </label>
      <select id="key-expiry" name="expiry" class="rounded-md border px-3 py-2">
        {#each data.expiryOptions as expiry (expiry)}
          <option value={expiry}>{messages[expiry]}</option>
        {/each}
      </select>
    </div>
    <fieldset class="space-y-2">
      <legend class="font-medium">{messages.scopes}</legend>
      <div class="grid gap-2 sm:grid-cols-2">
        {#each data.availableScopes as scope (scope)}
          <label class="flex items-center gap-2">
            <input type="checkbox" name="scope" value={scope} />
            <code class="text-sm">{scope}</code>
          </label>
        {/each}
      </div>
    </fieldset>
    <button
      type="submit"
      class="rounded-md bg-blue-700 px-4 py-2 font-medium text-white"
    >
      {messages.create}
    </button>
  </form>

  <section class="space-y-4" aria-labelledby="your-api-keys">
    <h2 id="your-api-keys" class="text-xl font-semibold">
      {messages.existing}
    </h2>
    {#if data.keys.length === 0}
      <p>{messages.empty}</p>
    {:else}
      <ul
        class="divide-y divide-neutral-300 border-y border-neutral-300 dark:divide-neutral-700 dark:border-neutral-700"
      >
        {#each data.keys as key (key.id)}
          <li class="flex flex-wrap items-start justify-between gap-3 py-4">
            <div class="min-w-0 space-y-1">
              <h3 class="break-words font-medium">{key.name}</h3>
              <code class="text-sm">{key.prefix}…</code>
              <p class="break-words font-mono text-sm">
                {key.scopes.join(', ')}
              </p>
              <dl
                class="space-y-1 text-sm text-neutral-700 dark:text-neutral-300"
              >
                <div class="flex gap-2">
                  <dt>{messages.expires}</dt>
                  <dd>
                    {key.expiresAt === null
                      ? messages.never
                      : dateTime.format(key.expiresAt * 1000)}
                  </dd>
                </div>
                <div class="flex gap-2">
                  <dt>{messages.lastUsed}</dt>
                  <dd>
                    {key.lastUsedAt === null
                      ? messages.never
                      : dateTime.format(key.lastUsedAt * 1000)}
                  </dd>
                </div>
              </dl>
            </div>
            {#if key.revokedAt !== null}
              <span class="text-sm">{messages.revoked}</span>
            {:else if key.expiresAt !== null && key.expiresAt <= data.now}
              <span class="text-sm">{messages.expired}</span>
            {:else}
              <form method="POST" action="?/revoke" use:enhance>
                <input type="hidden" name="csrfToken" value={data.csrfToken} />
                <input type="hidden" name="id" value={key.id} />
                <button
                  type="submit"
                  class="rounded-md border px-3 py-2 text-sm"
                >
                  {messages.revoke}
                </button>
              </form>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
