<script lang="ts">
  import { page } from '$app/state';
  import ChartNoAxesCombined from '@lucide/svelte/icons/chart-no-axes-combined';
  import Target from '@lucide/svelte/icons/target';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Plus from '@lucide/svelte/icons/plus';
  import Link2 from '@lucide/svelte/icons/link-2';
  import QrCode from '@lucide/svelte/icons/qr-code';
  import Shield from '@lucide/svelte/icons/shield';
  import FlaskConical from '@lucide/svelte/icons/flask-conical';
  import Route from '@lucide/svelte/icons/route';
  import Tags from '@lucide/svelte/icons/tags';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import { linkMessages } from '$lib/i18n/links';
  import { protectionMessages } from '$lib/i18n/protection';
  import { ruleMessages } from './[id]/rules/messages';
  import { simulationMessages } from './[id]/simulate/messages';
  import { linkUtmMessages } from './[id]/utm/messages';
  import { detailNavigation } from './messages';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  let m = $derived(linkMessages(data.locale));
  let analytics = $derived(analyticsMessages(data.locale));
  let protection = $derived(protectionMessages(data.locale));
  let rules = $derived(ruleMessages(data.locale));
  let simulation = $derived(simulationMessages(data.locale));
  let utm = $derived(linkUtmMessages(data.locale));
  let detailId = $derived(page.params.id);
  let isDetail = $derived(Boolean(detailId));
  let isNew = $derived(page.url.pathname === '/admin/links/new');
  let isIndex = $derived(!isDetail && !isNew);
  let detailBase = $derived(
    detailId ? `/admin/links/${encodeURIComponent(detailId)}` : '',
  );
  let currentPath = $derived(page.url.pathname);
  let toolsMenu = $state<HTMLDetailsElement>();

  const detailTabs = $derived([
    { href: detailBase, label: m.edit, icon: Link2 },
    { href: `${detailBase}/rules`, label: rules.title, icon: Route },
    {
      href: `${detailBase}/analytics`,
      label: analytics.title,
      title: analytics.linkTitle,
      icon: ChartNoAxesCombined,
    },
    {
      href: `${detailBase}/conversions`,
      label: analytics.conversions,
      icon: Target,
    },
  ]);
  const linkTools = $derived([
    { href: `${detailBase}/utm`, label: utm.title, icon: Tags },
    { href: `${detailBase}/qr`, label: protection.qr, icon: QrCode },
    { href: `${detailBase}/protection`, label: protection.title, icon: Shield },
    {
      href: `${detailBase}/simulate`,
      label: simulation.title,
      icon: FlaskConical,
    },
  ]);
  const currentTool = $derived(linkTools.find((tab) => isCurrent(tab.href)));
  const currentTab = $derived(detailTabs.find((tab) => isCurrent(tab.href)));

  function isCurrent(href: string) {
    return href === detailBase
      ? currentPath === href
      : currentPath === href || currentPath.startsWith(`${href}/`);
  }

  function closeTools() {
    if (toolsMenu) toolsMenu.open = false;
  }
</script>

<div class="mx-auto w-full max-w-6xl space-y-6">
  <header class={{ 'border-b': isDetail, 'border-line': isDetail }}>
    <div class={['workspace-intro', { 'border-b-0': isDetail }]}>
      <div class="space-y-1">
        {#if !isIndex}
          <a href="/admin/links" class="workspace-link min-h-8">
            <ArrowLeft size={15} aria-hidden="true" />{m.back}
          </a>
        {/if}
        <h1>
          {isNew
            ? m.create
            : (currentTab?.title ??
              currentTab?.label ??
              currentTool?.label ??
              (isDetail ? m.edit : m.links))}
        </h1>
        {#if data.linkContext}
          <p class="link-identity text-sm">
            {#if data.linkContext.title}<strong class="font-medium">
                {data.linkContext.title}
              </strong>{/if}
            <a href={data.linkContext.shortUrl} class="break-all text-link">
              {data.linkContext.shortUrl}
            </a>
          </p>
        {/if}
      </div>
      {#if isIndex}
        <a href="/admin/links/new" class="admin-button admin-button-primary">
          <Plus size={16} aria-hidden="true" />{m.create}
        </a>
      {/if}
    </div>
    {#if isDetail}
      <nav aria-label={m.links} class="context-nav link-tabs">
        {#each detailTabs as tab (tab.href)}
          <a
            href={tab.href}
            aria-current={isCurrent(tab.href) ? 'page' : undefined}
            onclick={closeTools}
          >
            <tab.icon
              size={16}
              strokeWidth={1.8}
              aria-hidden="true"
            />{tab.label}
          </a>
        {/each}
        <details class="link-tools" bind:this={toolsMenu}>
          <summary class:current-tool={Boolean(currentTool)}>
            {detailNavigation[data.locale]}
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <div class="link-tool-menu">
            {#each linkTools as tool (tool.href)}
              <a
                href={tool.href}
                aria-current={isCurrent(tool.href) ? 'page' : undefined}
                onclick={closeTools}
              >
                <tool.icon size={16} strokeWidth={1.8} aria-hidden="true" />
                {tool.label}
              </a>
            {/each}
          </div>
        </details>
      </nav>
    {/if}
  </header>
  {@render children()}
</div>

<style>
  .link-tabs {
    border-bottom: 0;
    margin-bottom: 0;
  }
  .link-identity {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    align-items: baseline;
    overflow-wrap: anywhere;
  }
  .link-identity a:hover {
    text-decoration: underline;
  }
  .link-tools {
    position: relative;
  }
  .link-tools summary {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 44px;
    padding-inline: 0.65rem;
    cursor: pointer;
    list-style: none;
    color: var(--ui-text-muted);
  }
  .link-tools summary::-webkit-details-marker {
    display: none;
  }
  .link-tools summary:hover,
  .link-tools summary.current-tool {
    color: var(--ui-link);
  }
  .link-tools summary.current-tool {
    box-shadow: inset 0 -2px var(--ui-primary);
  }
  .link-tool-menu {
    position: absolute;
    z-index: 2;
    inset-inline-end: 0;
    width: max-content;
    max-width: min(14rem, calc(100vw - 2rem));
    padding: 0.3rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-lg);
    background: var(--ui-surface);
    box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  }
  .link-tool-menu a {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-height: 44px;
    padding-inline: 0.6rem;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text);
    text-decoration: none;
  }
  .link-tool-menu a:is(:hover, [aria-current='page']) {
    color: var(--ui-link);
    background: var(--ui-accent-surface);
  }
  @media (max-width: 1050px) {
    .link-tool-menu {
      inset-inline-start: 0;
      inset-inline-end: auto;
      position: relative;
      box-shadow: none;
    }
  }
</style>
