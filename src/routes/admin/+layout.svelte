<script lang="ts">
  import { messagesFor } from '$lib/i18n/locale';
  import { linkMessages } from '$lib/i18n/links';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  let messages = $derived(messagesFor(data.locale));
  let links = $derived(linkMessages(data.locale));
  let preferences = $derived(preferenceMessages(data.locale));
</script>

<div class="min-h-screen">
  <header class="border-b border-neutral-300 dark:border-neutral-700">
    <div
      class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4"
    >
      <a href="/admin" class="text-xl font-semibold tracking-tight">
        Linkrovia
      </a>
      <div class="flex items-center gap-4">
        <span class="text-sm text-neutral-600 dark:text-neutral-300">
          {data.user.email}
        </span>
        <span class="text-sm text-neutral-600 dark:text-neutral-300">
          {preferences.effective}: {data.timeZone}
        </span>
        <form method="POST" action="/logout">
          <input type="hidden" name="csrfToken" value={data.csrfToken} /><button
            type="submit"
            class="text-sm font-medium underline underline-offset-4"
          >
            {messages['admin.signOut']}
          </button>
        </form>
      </div>
    </div>
    <nav
      aria-label={messages['admin.title']}
      class="mx-auto flex max-w-6xl flex-wrap gap-6 px-6 pb-4 text-sm font-medium"
    >
      <a href="/admin" class="hover:underline">{messages['admin.overview']}</a>
      <a href="/admin/links" class="hover:underline">{links.links}</a>
      <a href="/admin/domains" class="hover:underline">{links.domains}</a>
      <a href="/admin/settings" class="hover:underline">
        {preferences.settings}
      </a>
      <a href="/admin/settings/security" class="hover:underline">
        {messages['admin.security']}
      </a>
      <a href="/admin/api-keys" class="hover:underline">
        {messages['admin.apiKeys']}
      </a>
    </nav>
  </header>
  <main class="mx-auto max-w-6xl px-6 py-10">{@render children()}</main>
</div>
