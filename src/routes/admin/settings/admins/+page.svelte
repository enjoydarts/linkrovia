<script lang="ts">
  import { brand } from '$lib/brand';
  import { adminInviteMessages } from '$lib/i18n/admin-invites';
  import { messagesFor } from '$lib/i18n/locale';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import '../../admin-context.css';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(adminInviteMessages[data.locale]);
  let messages = $derived(messagesFor(data.locale));
  let preferences = $derived(preferenceMessages(data.locale));
  let format = $derived(
    new Intl.DateTimeFormat(data.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: data.timeZone,
    }),
  );
  let copied = $state(false);

  async function copyInvite(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      document.getElementById('invite-url')?.focus();
    }
  }
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>
<div class="max-w-2xl space-y-8">
  <header class="context-header space-y-2">
    <nav class="context-nav" aria-label={preferences.settings}>
      <a href="/admin/settings">{preferences.personal}</a>
      <a href="/admin/settings/security">{messages['admin.security']}</a>
      <span aria-current="page">{m.title}</span>
    </nav>
    <h1 class="text-3xl font-semibold tracking-tight">{m.title}</h1>
    <p>{m.intro}</p>
  </header>

  {#if form?.inviteUrl}
    {@const url = form.inviteUrl}
    <section
      class="context-panel space-y-3 rounded-lg border border-line bg-surface p-5"
    >
      <label for="invite-url" class="block font-medium">{m.link}</label>
      <p id="invite-help" class="text-sm text-muted">{m.share}</p>
      <input
        id="invite-url"
        type="text"
        class="w-full rounded-md border border-control bg-surface px-3 py-2"
        value={url}
        readonly
        aria-describedby="invite-help"
        onfocus={(event) => event.currentTarget.select()}
      />
      <button
        type="button"
        class="rounded-md border border-control px-3 py-2"
        onclick={() => copyInvite(url)}
      >
        {m.copy}
      </button>
      <span role="status">{copied ? m.copied : ''}</span>
    </section>
  {/if}

  {#if data.available}
    <form
      method="POST"
      action="?/invite"
      class="context-panel space-y-3 rounded-lg border border-line bg-surface p-5"
    >
      <input type="hidden" name="csrfToken" value={data.csrfToken} />
      <label for="email" class="block font-medium">
        {messages['auth.email']}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autocomplete="off"
        maxlength="254"
        class="w-full rounded-md border border-control bg-surface px-3 py-2"
      />
      {#if form?.code}
        <p role="alert" class="text-negative">
          {form.code === 'duplicate'
            ? m.duplicate
            : messages['error.invalid_input']}
        </p>
      {/if}
      <button
        type="submit"
        class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
      >
        {m.invite}
      </button>
    </form>
  {:else}
    <p role="alert">{messages['passkey.unavailable']}</p>
  {/if}

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">{m.pending}</h2>
    {#if data.invitations.length}
      <ul class="divide-y divide-line rounded-lg border border-line">
        {#each data.invitations as invitation (invitation.id)}
          <li class="flex flex-wrap items-center justify-between gap-3 p-4">
            <div class="min-w-0 break-all">
              <p>{invitation.email}</p>
              <p class="text-sm text-muted">
                {m.expires}
                <time
                  datetime={new Date(
                    invitation.expires_at * 1000,
                  ).toISOString()}
                >
                  {format.format(invitation.expires_at * 1000)}
                </time>
              </p>
            </div>
            <form method="POST" action="?/revoke">
              <input type="hidden" name="csrfToken" value={data.csrfToken} />
              <input type="hidden" name="id" value={invitation.id} />
              <button
                type="submit"
                class="rounded-md border border-control px-3 py-2"
                aria-label={m.revoke + ' · ' + invitation.email}
              >
                {m.revoke}
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-muted">{m.noInvites}</p>
    {/if}
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">{m.admins}</h2>
    {#if data.admins.length}
      <ul class="divide-y divide-line rounded-lg border border-line">
        {#each data.admins as admin (admin.id)}
          <li class="flex flex-wrap items-center justify-between gap-3 p-4">
            <p class="min-w-0 break-all">{admin.email}</p>
            {#if admin.disabled_at !== null}
              <span class="text-muted">{m.disabled}</span>
            {:else}
              <form
                method="POST"
                action="?/disable"
                onsubmit={(event) => {
                  if (!window.confirm(m.confirmDisable + '\n' + admin.email))
                    event.preventDefault();
                }}
              >
                <input type="hidden" name="csrfToken" value={data.csrfToken} />
                <input type="hidden" name="id" value={admin.id} />
                <button
                  type="submit"
                  class="rounded-md border border-control px-3 py-2 text-negative"
                  aria-label={m.disable + ' · ' + admin.email}
                >
                  {m.disable}
                </button>
              </form>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-muted">{m.noAdmins}</p>
    {/if}
  </section>
</div>
