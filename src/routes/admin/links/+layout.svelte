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
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import { linkMessages } from '$lib/i18n/links';
  import { protectionMessages } from '$lib/i18n/protection';
  import { ruleMessages } from './[id]/rules/messages';
  import { simulationMessages } from './[id]/simulate/messages';
  import { linkUtmMessages } from './[id]/utm/messages';
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

  const detailTabs = $derived([
    { href: detailBase, label: m.edit, icon: Link2 },
    { href: `${detailBase}/rules`, label: rules.title, icon: Route },
    { href: `${detailBase}/utm`, label: utm.title, icon: Tags },
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
    { href: `${detailBase}/qr`, label: protection.qr, icon: QrCode },
    { href: `${detailBase}/protection`, label: protection.title, icon: Shield },
    {
      href: `${detailBase}/simulate`,
      label: simulation.title,
      icon: FlaskConical,
    },
  ]);
  const currentTab = $derived(detailTabs.find((tab) => isCurrent(tab.href)));

  function isCurrent(href: string) {
    return href === detailBase
      ? currentPath === href
      : currentPath === href || currentPath.startsWith(`${href}/`);
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
              (isDetail ? m.edit : m.links))}
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
    border-bottom: 0;
    margin-bottom: 0;
  }
</style>
