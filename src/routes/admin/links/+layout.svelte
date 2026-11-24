<script lang="ts">
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

  let groups = $derived([
    {
      label: labels.configuration,
      entries: [
        { suffix: '', label: m.edit, icon: Link2 },
        { suffix: '/rules', label: rules.title, icon: Route },
        { suffix: '/protection', label: protection.title, icon: Shield },
        { suffix: '/simulate', label: simulation.title, icon: FlaskConical },
      ],
    },
    {
      label: labels.performance,
      entries: [
        {
          suffix: '/analytics',
          label: analytics.title,
          icon: ChartNoAxesCombined,
        },
        { suffix: '/conversions', label: analytics.conversions, icon: Target },
      ],
    },
    {
      label: labels.sharing,
      entries: [
        { suffix: '/qr', label: protection.qr, icon: QrCode },
        { suffix: '/utm', label: utm.title, icon: Tags },
      ],
    },
  ]);
  let active = $derived(
    groups
      .flatMap(({ entries }) => entries)
      .find(({ suffix }) => isCurrent(suffix)),
  );
  let sectionTitle = $derived(
    active?.suffix === '/analytics'
      ? analytics.linkTitle
      : (active?.label ?? m.edit),
  );
  let sections = $state<HTMLDetailsElement>();
  let copied = $state<{ url: string; ok: boolean } | null>(null);

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

  function closeSections() {
    if (sections) sections.open = false;
  }
</script>

{#snippet navigation()}
  <nav aria-label={m.links}>
    {#each groups as group (group.label)}
      <div class="subnav-group">
        <p>{group.label}</p>
        <ul>
          {#each group.entries as entry (entry.suffix)}
            <li>
              <a
                href={linkPath + entry.suffix}
                aria-current={isCurrent(entry.suffix) ? 'page' : undefined}
                onclick={closeSections}
              >
                <entry.icon size={17} strokeWidth={1.8} aria-hidden="true" />
                <span>{entry.label}</span>
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
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
    </header>
    <div class="link-columns">
      <aside class="link-sections">
        {@render navigation()}
      </aside>
      <details class="mobile-sections" bind:this={sections}>
        <summary>
          {labels.sections}
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        {@render navigation()}
      </details>
      <div class="link-task">
        <h1>{sectionTitle}</h1>
        {@render children()}
      </div>
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
  .link-columns {
    display: grid;
    grid-template-columns: minmax(9rem, 11.6rem) minmax(0, 1fr);
    align-items: start;
    gap: clamp(0.9rem, 1.7vw, 1.6rem);
  }
  .link-sections {
    position: sticky;
    top: 0.8rem;
    min-width: 0;
    padding-inline-end: 0.75rem;
    border-inline-end: 1px solid var(--ui-border);
  }
  .subnav-group + .subnav-group {
    margin-top: 0.85rem;
  }
  .subnav-group p {
    margin: 0 0 0.3rem;
    padding-inline: 0.55rem;
    font-size: 0.75rem;
    font-weight: 680;
    color: var(--ui-text-muted);
  }
  .subnav-group ul {
    display: grid;
    gap: 0.12rem;
  }
  .subnav-group a {
    display: flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.5rem;
    padding-inline: 0.55rem;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    font-size: 0.86rem;
    font-weight: 620;
    overflow-wrap: anywhere;
  }
  .subnav-group a :global(svg) {
    flex: none;
  }
  .subnav-group a:hover {
    background: var(--ui-surface);
    color: var(--ui-text);
  }
  .subnav-group a[aria-current='page'] {
    background: var(--ui-accent-surface);
    color: var(--ui-link);
    box-shadow: inset 3px 0 var(--ui-primary);
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
  @media (max-width: 1050px) {
    .link-columns {
      grid-template-columns: minmax(0, 1fr);
    }
    .link-sections {
      display: none;
    }
    .mobile-sections {
      display: block;
      padding: 0.25rem 0.65rem;
      border: 1px solid var(--ui-border);
      border-radius: var(--ui-radius-sm);
      background: var(--ui-surface);
    }
    .mobile-sections summary {
      display: flex;
      min-height: 2.75rem;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding-inline: 0.45rem;
      color: var(--ui-link);
      font-weight: 650;
      cursor: pointer;
      list-style: none;
    }
    .mobile-sections summary::-webkit-details-marker {
      display: none;
    }
    .mobile-sections nav {
      padding: 0.45rem 0 0.7rem;
      border-top: 1px solid var(--ui-border);
    }
    .mobile-sections ul {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
