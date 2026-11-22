<script lang="ts">
  import { brand } from '$lib/brand';
  import { messagesFor } from '$lib/i18n/locale';
  import { linkMessages } from '$lib/i18n/links';
  import { protectionMessages } from '$lib/i18n/protection';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(protectionMessages(data.locale));
  let common = $derived(messagesFor(data.locale));
  let link = $derived(linkMessages(data.locale));
  let message = $derived(
    form?.code === 'stale_link'
      ? link.conflict
      : form?.code === 'temporary_redirect'
        ? m.temporaryRedirect
        : form?.code === 'password_required'
          ? m.passwordHelp
          : form?.code === 'rate_limit'
            ? common['error.rate_limit']
            : form?.code
              ? common['error.invalid_input']
              : null,
  );
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>
<section class="max-w-2xl space-y-5">
  <h2 class="text-xl font-semibold tracking-tight">{m.title}</h2>
  {#if data.link.redirectType === 301 || data.link.redirectType === 308}
    <p>{m.temporaryRedirect}</p>
  {/if}
  {#if data.link.consumedAt !== null}<p>{m.alreadyRedeemed}</p>{/if}
  <form
    method="POST"
    class="space-y-5 rounded-xl border p-5"
    style="border-color: var(--ui-border); background: var(--ui-surface)"
  >
    <input type="hidden" name="csrfToken" value={data.csrfToken} />
    <input type="hidden" name="updatedAt" value={data.link.updatedAt} />
    <label class="block space-y-2">
      <span class="block font-medium">{m.title}</span>
      <select name="mode" class="w-full rounded-md border px-3 py-2">
        <option value="none" selected={data.link.protectionMode === 'none'}>
          {m.none}
        </option>
        <option
          value="password"
          selected={data.link.protectionMode === 'password'}
        >
          {m.password}
        </option>
        <option
          value="one_time"
          selected={data.link.protectionMode === 'one_time'}
        >
          {m.oneTime}
        </option>
        <option
          value="password_one_time"
          selected={data.link.protectionMode === 'password_one_time'}
        >
          {m.passwordOneTime}
        </option>
      </select>
    </label>
    <label class="block space-y-2">
      <span class="block font-medium">{m.password}</span>
      <input
        name="password"
        type="password"
        autocomplete="new-password"
        maxlength="128"
        minlength="12"
        aria-describedby="password-help"
        class="w-full rounded-md border px-3 py-2"
      />
    </label>
    <p id="password-help" class="text-sm" style="color: var(--ui-text-muted)">
      {m.passwordHelp}
      {m.paidNote}
    </p>
    {#if message}<p role="alert" class="text-negative">
        {message}
      </p>{/if}
    {#if form?.saved}<p role="status">{m.saved}</p>{/if}
    <button
      type="submit"
      class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
    >
      {link.save}
    </button>
  </form>
</section>
