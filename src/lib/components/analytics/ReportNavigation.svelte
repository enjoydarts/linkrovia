<script lang="ts">
  import ChartNoAxesCombined from '@lucide/svelte/icons/chart-no-axes-combined';
  import Target from '@lucide/svelte/icons/target';
  import type { Locale } from '$lib/i18n/locale';
  import { analyticsMessages } from './messages';

  let {
    locale,
    current,
  }: { locale: Locale; current: 'clicks' | 'conversions' } = $props();
  let m = $derived(analyticsMessages(locale));
</script>

<header class="workspace-intro"><h1>{m.title}</h1></header>
<nav aria-label={m.title}>
  <a
    href="/admin/analytics"
    aria-current={current === 'clicks' ? 'page' : undefined}
  >
    <ChartNoAxesCombined size={16} aria-hidden="true" />{m.clicks}
  </a>
  <a
    href="/admin/analytics/conversions"
    aria-current={current === 'conversions' ? 'page' : undefined}
  >
    <Target size={16} aria-hidden="true" />{m.conversions}
  </a>
</nav>

<style>
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    border-bottom: 1px solid var(--ui-border);
    margin-block: 0.3rem 1.35rem;
  }
  a {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    gap: 0.5rem;
    padding-inline: 0.7rem;
    border-bottom: 2px solid transparent;
    color: var(--ui-text-muted);
    font-size: 0.875rem;
    font-weight: 590;
  }
  a:hover,
  a[aria-current='page'] {
    color: var(--ui-link);
  }
  a[aria-current='page'] {
    border-bottom-color: var(--ui-primary);
  }
</style>
