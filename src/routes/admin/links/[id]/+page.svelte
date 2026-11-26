<script lang="ts">
  import { brand } from '$lib/brand';
  import LinkForm from '$lib/components/links/LinkForm.svelte';
  import { linkExtra, linkMessages } from '$lib/i18n/links';
  import { protectionMessages } from '$lib/i18n/protection';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();
  let m = $derived(linkMessages(data.locale));
  let x = $derived(linkExtra(data.locale));
  let protection = $derived(protectionMessages(data.locale));
</script>

<svelte:head><title>{m.edit} · {brand.name}</title></svelte:head>
<div class="admin-section-stack">
  {#if form?.code === 'temporary_redirect'}
    <p role="alert" class="text-negative">
      {protection.temporaryRedirect}
    </p>
  {/if}
  {#if data.demoGuest && !data.canEditLink && data.link}
    <section class="context-panel">
      <dl class="demo-details">
        <div>
          <dt>{m.destination}</dt>
          <dd>{data.link.destinationUrl}</dd>
        </div>
        <div>
          <dt>{m.status}</dt>
          <dd>{data.link.isActive ? m.active : m.inactive}</dd>
        </div>
        <div>
          <dt>{m.tag}</dt>
          <dd>{data.link.tags.join(', ') || '—'}</dd>
        </div>
      </dl>
    </section>
  {:else}
    <LinkForm
      formAction="?/save"
      locale={data.locale}
      csrfToken={data.csrfToken}
      domains={data.domains}
      link={data.link}
      timeZone={data.timeZone}
      error={form?.code === 'temporary_redirect' ? undefined : form?.code}
      values={form && 'values' in form ? form.values : undefined}
    />
    {#if data.link && !data.demoGuest}
      <details class="context-panel">
        <summary class="cursor-pointer font-medium text-negative">
          {x.deleteHelp}
        </summary>
        <form method="POST" action="?/remove" class="mt-4 space-y-4">
          <input type="hidden" name="csrfToken" value={data.csrfToken} />
          <input
            type="hidden"
            name="updatedAt"
            value={form && 'values' in form && form.values
              ? form.values.updatedAt
              : data.link.updatedAt}
          />
          <label class="flex items-center gap-2">
            <input type="checkbox" required />{x.confirmDelete}
          </label>
          <button type="submit" class="admin-button admin-button-danger">
            {m.remove}
          </button>
        </form>
      </details>
    {/if}
  {/if}
</div>

<style>
  .demo-details {
    display: grid;
    gap: 1rem;
  }
  .demo-details dt {
    color: var(--ui-text-muted);
    font-size: 0.85rem;
  }
  .demo-details dd {
    margin: 0.25rem 0 0;
    overflow-wrap: anywhere;
  }
</style>
