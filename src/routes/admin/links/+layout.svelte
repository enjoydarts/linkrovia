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
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import { linkMessages } from '$lib/i18n/links';
  import { protectionMessages } from '$lib/i18n/protection';
  import { simulationMessages } from './[id]/simulate/messages';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  let m = $derived(linkMessages(data.locale));
  let analytics = $derived(analyticsMessages(data.locale));
  let protection = $derived(protectionMessages(data.locale));
  let simulation = $derived(simulationMessages(data.locale));
  let detailId = $derived(page.params.id);
  let isDetail = $derived(Boolean(detailId));
  let isNew = $derived(page.url.pathname === '/admin/links/new');
  let isIndex = $derived(!isDetail && !isNew);
  let detailBase = $derived(
    detailId ? `/admin/links/${encodeURIComponent(detailId)}` : '',
  );
  let currentPath = $derived(page.url.pathname);

  const detailTabs = $derived([
    { href: detailBase, label: m.edit, icon: Link2 },
    {
      href: `${detailBase}/analytics`,
      label: analytics.title,
      icon: ChartNoAxesCombined,
    },
    {
      href: `${detailBase}/conversions`,
      label: analytics.conversions,
      icon: Target,
    },
    { href: `${detailBase}/qr`, label: protection.qr, icon: QrCode },
    { href: `${detailBase}/protection`, label: protection.title, icon: Shield },
    {
      href: `${detailBase}/simulate`,
      label: simulation.title,
      icon: FlaskConical,
    },
  ]);

  function isCurrent(href: string) {
    return href === detailBase
      ? currentPath === href
      : currentPath.startsWith(href);
  }
</script>

<div class="mx-auto w-full max-w-6xl space-y-6">
  <header class:border-b={isDetail} class:border-line={isDetail}>
    <div class="workspace-intro" class:border-b-0={isDetail}>
      <div class="space-y-1">
        {#if !isIndex}
          <a href="/admin/links" class="workspace-link min-h-8">
            <ArrowLeft size={15} aria-hidden="true" />{m.back}
          </a>
        {/if}
        <h1>
          {isNew
            ? m.create
            : currentPath.endsWith('/analytics')
              ? analytics.linkTitle
              : currentPath.endsWith('/conversions')
                ? analytics.conversions
                : currentPath.endsWith('/qr')
                  ? protection.qr
                  : currentPath.endsWith('/protection')
                    ? protection.title
                    : currentPath.endsWith('/simulate')
                      ? simulation.title
                      : isDetail
                        ? m.edit
                        : m.links}
        </h1>
        {#if data.linkContext}
          <p class="break-words text-sm">
            {#if data.linkContext.title}<strong class="font-medium">
                {data.linkContext.title}
              </strong>{/if}
            <code class="block break-all text-xs">
              {data.linkContext.shortUrl}
            </code>
          </p>
        {/if}
      </div>
      {#if isIndex}
        <a
          href="/admin/links/new"
          class="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover"
        >
          <Plus size={16} aria-hidden="true" />{m.create}
        </a>
      {/if}
    </div>
    {#if isDetail}
      <nav aria-label={m.links} class="link-tabs">
        {#each detailTabs as tab (tab.href)}
          <a
            href={tab.href}
            aria-current={isCurrent(tab.href) ? 'page' : undefined}
          >
            <tab.icon
              size={16}
              strokeWidth={1.8}
              aria-hidden="true"
            />{tab.label}
          </a>
        {/each}
      </nav>
    {/if}
  </header>
  {@render children()}
</div>

<style>
  .link-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.35rem;
  }
  .link-tabs a {
    display: inline-flex;
    min-height: 42px;
    gap: 0.45rem;
    align-items: center;
    padding-inline: clamp(0.45rem, 1.1vw, 0.8rem);
    border-bottom: 2px solid transparent;
    color: var(--ui-text-muted);
    font-size: 0.86rem;
    font-weight: 580;
  }
  .link-tabs a:hover,
  .link-tabs a[aria-current='page'] {
    color: var(--ui-link);
  }
  .link-tabs a[aria-current='page'] {
    border-bottom-color: var(--ui-link);
  }
</style>
