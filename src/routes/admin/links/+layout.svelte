<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ChartNoAxesCombined from '@lucide/svelte/icons/chart-no-axes-combined';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Copy from '@lucide/svelte/icons/copy';
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import Link2 from '@lucide/svelte/icons/link-2';
  import Plus from '@lucide/svelte/icons/plus';
  import QrCode from '@lucide/svelte/icons/qr-code';
  import Route from '@lucide/svelte/icons/route';
  import Shield from '@lucide/svelte/icons/shield';
  import Tags from '@lucide/svelte/icons/tags';
  import Target from '@lucide/svelte/icons/target';
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import { linkMessages } from '$lib/i18n/links';
  import { protectionMessages } from '$lib/i18n/protection';
  import { ruleMessages } from './[id]/rules/messages';
  import { simulationMessages } from './[id]/simulate/messages';
  import { linkUtmMessages } from './[id]/utm/messages';
  import { detailNavigation, listMessages } from './messages';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  let m = $derived(linkMessages(data.locale));
  let labels = $derived(detailNavigation[data.locale]);
  let clipboard = $derived(listMessages[data.locale]);
  let analytics = $derived(analyticsMessages(data.locale));
  let protection = $derived(protectionMessages(data.locale));
  let rules = $derived(ruleMessages(data.locale));
  let simulation = $derived(simulationMessages(data.locale));
  let utm = $derived(linkUtmMessages(data.locale));
  let detailId = $derived(page.params.id);
  let isNew = $derived(page.url.pathname === '/admin/links/new');
  let linkPath = $derived(
    detailId ? `/admin/links/${encodeURIComponent(detailId)}` : '',
  );

  let sectionsList = $derived([
    { suffix: '', label: m.edit, icon: Link2 },
    { suffix: '/rules', label: rules.title, icon: Route },
    {
      suffix: '/analytics',
      label: analytics.title,
      icon: ChartNoAxesCombined,
    },
    { suffix: '/conversions', label: analytics.conversions, icon: Target },
    { suffix: '/protection', label: protection.title, icon: Shield },
    { suffix: '/qr', label: protection.qr, icon: QrCode },
    { suffix: '/utm', label: utm.title, icon: Tags },
    { suffix: '/simulate', label: simulation.title, icon: FlaskConical },
  ]);
  let active = $derived(sectionsList.find(({ suffix }) => isCurrent(suffix)));
  let sectionTitle = $derived(
    active?.suffix === '/analytics'
      ? analytics.linkTitle
      : (active?.label ?? m.edit),
  );
  let sections = $state<HTMLDetailsElement>();
  let copied = $state<{ url: string; ok: boolean } | null>(null);

  afterNavigate(({ from, to }) => {
    if (!sections?.open || from?.url.pathname === to?.url.pathname) return;
    const focusWithin = sections.contains(document.activeElement);
    sections.open = false;
    if (focusWithin) sections.querySelector('summary')?.focus();
  });

  function isCurrent(suffix: string) {
    return page.url.pathname === linkPath + suffix;
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      copied = { url, ok: true };
    } catch {
      copied = { url, ok: false };
    }
  }
</script>

{#snippet navigation()}
  <nav aria-label={m.links}>
    <ul>
      {#each sectionsList as entry (entry.suffix)}
        <li>
          <a
            href={linkPath + entry.suffix}
            aria-current={isCurrent(entry.suffix) ? 'page' : undefined}
          >
            <entry.icon size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{entry.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/snippet}

{#if detailId}
  <div class="link-workspace">
    <header class="record-bar">
      <a class="back-link" href="/admin/links">
        <ArrowLeft size={16} aria-hidden="true" />
        {m.back}
      </a>
      {#if data.linkContext}
        {@const shortUrl = data.linkContext.shortUrl}
        <div class="record-main">
          <div class="record-key">
            <span class="record-icon">
              <Link2 size={22} aria-hidden="true" />
            </span>
            <div class="record-identity">
              {#if data.linkContext.title}<span class="record-name">
                  {data.linkContext.title}
                </span>{/if}
              <a class="record-url" href={shortUrl}>{shortUrl}</a>
            </div>
          </div>
          <button
            class="admin-button"
            type="button"
            onclick={() => copyUrl(shortUrl)}
          >
            <Copy size={16} aria-hidden="true" />
            {clipboard.copy}
          </button>
        </div>
        {#if copied?.url === shortUrl}
          <p class="copy-status" role="status">
            {copied.ok ? clipboard.copied : clipboard.copyError}
          </p>
        {/if}
      {/if}
      <div class="link-sections">
        {@render navigation()}
      </div>
      <details class="mobile-sections" bind:this={sections}>
        <summary>
          <span class="section-summary">
            <span>{labels.sections}</span>
            {#if active}<span class="section-current">{active.label}</span>{/if}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        {@render navigation()}
      </details>
    </header>
    <div class="link-task">
      <h1>{sectionTitle}</h1>
      {@render children()}
    </div>
  </div>
{:else}
  <div class="link-workspace">
    <header class="workspace-intro index-header">
      <div>
        {#if isNew}
          <a href="/admin/links" class="back-link">
            <ArrowLeft size={16} aria-hidden="true" />{m.back}
          </a>
        {/if}
        <h1>{isNew ? m.create : m.links}</h1>
      </div>
      {#if !isNew}
        <a href="/admin/links/new" class="admin-button admin-button-primary">
          <Plus size={17} aria-hidden="true" />{m.create}
        </a>
      {/if}
    </header>
    {@render children()}
  </div>
{/if}

<style>
  .link-workspace {
    display: grid;
    gap: clamp(0.85rem, 2vw, 1.5rem);
    min-width: 0;
    container-type: inline-size;
  }
  .index-header {
    margin: 0;
  }
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    min-height: 2.5rem;
    color: var(--ui-link);
    font-size: 0.875rem;
    font-weight: 650;
    text-underline-offset: 0.2em;
  }
  .back-link:hover {
    text-decoration: underline;
  }
  .record-bar {
    display: grid;
    gap: 0.5rem;
    padding: clamp(0.9rem, 2.1vw, 1.35rem);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-lg);
    background: var(--ui-surface);
  }
  .record-main,
  .record-key {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    min-width: 0;
  }
  .record-main {
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .record-key {
    flex: 1 1 18rem;
  }
  .record-icon {
    display: grid;
    flex: 0 0 2.6rem;
    min-height: 2.6rem;
    place-items: center;
    color: var(--ui-link);
    background: var(--ui-accent-surface);
    border-radius: var(--ui-radius-sm);
  }
  .record-identity {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .record-name {
    font-size: clamp(1rem, 2vw, 1.3rem);
    font-weight: 730;
    letter-spacing: -0.025em;
  }
  .record-url {
    color: var(--ui-link);
    font-family: var(--ui-mono);
    font-size: 0.79rem;
    text-underline-offset: 0.2em;
  }
  .record-url:hover {
    text-decoration: underline;
  }
  .copy-status {
    color: var(--ui-text-muted);
    font-size: 0.83rem;
  }
  .link-sections {
    margin-block-start: 0.55rem;
    border-block-start: 1px solid var(--ui-border);
  }
  .link-sections ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1.3rem;
  }
  nav a {
    display: flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.5rem;
    color: var(--ui-text-muted);
    font-size: 0.875rem;
    font-weight: 570;
    overflow-wrap: anywhere;
  }
  nav a :global(svg) {
    flex: none;
  }
  nav a:hover,
  nav a[aria-current='page'] {
    color: var(--ui-link);
  }
  .link-sections a {
    border-block-end: 2px solid transparent;
  }
  .link-sections a[aria-current='page'] {
    border-block-end-color: var(--ui-primary);
  }
  .link-task {
    display: grid;
    gap: 1.05rem;
    min-width: 0;
  }
  .link-task h1 {
    margin: 0;
    font-size: clamp(1.45rem, 2.5vw, 1.9rem);
    font-weight: 740;
    letter-spacing: -0.035em;
    overflow-wrap: anywhere;
  }
  .mobile-sections {
    display: none;
  }
  @container (max-width: 50rem) {
    .link-sections {
      display: none;
    }
    .mobile-sections {
      display: block;
      margin-block-start: 0.55rem;
      border-block-start: 1px solid var(--ui-border);
    }
    .mobile-sections summary {
      display: flex;
      min-height: 2.75rem;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      color: var(--ui-link);
      font-weight: 650;
      cursor: pointer;
      list-style: none;
    }
    .mobile-sections summary::-webkit-details-marker {
      display: none;
    }
    .mobile-sections summary :global(svg) {
      flex: none;
    }
    .section-summary {
      display: flex;
      flex-wrap: wrap;
      column-gap: 0.55rem;
      align-items: baseline;
      font-size: 0.875rem;
    }
    .section-current {
      color: var(--ui-text-muted);
      font-weight: 500;
    }
    .mobile-sections nav {
      padding-block: 0.25rem;
    }
    .mobile-sections ul {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.2rem;
    }
    .mobile-sections a {
      padding-inline: 0.45rem;
      border-radius: var(--ui-radius-sm);
    }
    .mobile-sections a[aria-current='page'] {
      background: var(--ui-accent-surface);
    }
  }
  @container (max-width: 26rem) {
    .mobile-sections ul {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
