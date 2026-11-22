<script lang="ts">
  import { page } from '$app/state';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Link2 from '@lucide/svelte/icons/link-2';
  import ChartNoAxesCombined from '@lucide/svelte/icons/chart-no-axes-combined';
  import Target from '@lucide/svelte/icons/target';
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import Upload from '@lucide/svelte/icons/upload';
  import Archive from '@lucide/svelte/icons/archive';
  import { backupMessages } from './backup/messages';
  import Route from '@lucide/svelte/icons/route';
  import Globe from '@lucide/svelte/icons/globe';
  import Settings from '@lucide/svelte/icons/settings';
  import Shield from '@lucide/svelte/icons/shield';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import Menu from '@lucide/svelte/icons/menu';
  import X from '@lucide/svelte/icons/x';
  import { csvMessages } from './import/messages';
  import Brand from '$lib/components/Brand.svelte';
  import { messagesFor } from '$lib/i18n/locale';
  import { linkMessages } from '$lib/i18n/links';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  let messages = $derived(messagesFor(data.locale));
  let links = $derived(linkMessages(data.locale));
  let preferences = $derived(preferenceMessages(data.locale));
  let nav = $derived([
    {
      href: '/admin',
      label: messages['admin.overview'],
      icon: LayoutDashboard,
    },
    { href: '/admin/links', label: links.links, icon: Link2 },
    {
      href: '/admin/analytics',
      label: analyticsMessages(data.locale).title,
      icon: ChartNoAxesCombined,
    },
    {
      href: '/admin/conversions',
      label: analyticsMessages(data.locale).conversions,
      icon: Target,
    },
    {
      href: '/admin/import',
      label: csvMessages(data.locale).title,
      icon: Upload,
    },
    ...(data.user.role === 'owner'
      ? [
          {
            href: '/admin/backup',
            label: backupMessages(data.locale).title,
            icon: Archive,
          },
          {
            href: '/admin/integrations/mcp',
            label: 'MCP',
            icon: Route,
          },
        ]
      : []),
    { href: '/admin/utm', label: 'UTM', icon: Route },
    { href: '/admin/domains', label: links.domains, icon: Globe },
    { href: '/admin/settings', label: preferences.settings, icon: Settings },
    {
      href: '/admin/settings/security',
      label: messages['admin.security'],
      icon: Shield,
    },
    {
      href: '/admin/api-keys',
      label: messages['admin.apiKeys'],
      icon: KeyRound,
    },
  ]);
  let drawer: HTMLDialogElement;
  const menuLabels = {
    en: 'Open navigation',
    ja: 'ナビゲーションを開く',
    'zh-CN': '打开导航',
    'zh-TW': '開啟導覽',
    es: 'Abrir navegación',
    it: 'Apri navigazione',
    fr: 'Ouvrir la navigation',
  };
  const closeLabels = {
    en: 'Close navigation',
    ja: 'ナビゲーションを閉じる',
    'zh-CN': '关闭导航',
    'zh-TW': '關閉導覽',
    es: 'Cerrar navegación',
    it: 'Chiudi navigazione',
    fr: 'Fermer la navigation',
  };
  function active(href: string, path: string) {
    return href === '/admin' || href === '/admin/settings'
      ? href === path
      : path === href || path.startsWith(`${href}/`);
  }
</script>

{#snippet navigation()}
  <nav aria-label={messages['admin.title']} class="navigation">
    {#each nav as item (item.href)}
      <a
        href={item.href}
        aria-current={active(item.href, page.url.pathname) ? 'page' : undefined}
        class:active={active(item.href, page.url.pathname)}
        onclick={() => drawer?.close()}
      >
        <item.icon size={19} strokeWidth={1.8} aria-hidden="true" /><span>
          {item.label}
        </span>
      </a>
    {/each}
  </nav>
{/snippet}
<div class="admin-shell">
  <aside class="sidebar">
    <div class="brand-wrap"><Brand href="/admin" tone="dark" /></div>
    {@render navigation()}
  </aside>
  <dialog
    id="admin-navigation"
    class="drawer"
    bind:this={drawer}
    aria-label={messages['admin.title']}
  >
    <div class="drawer-header">
      <Brand href="/admin" tone="dark" /><button
        class="drawer-close"
        type="button"
        aria-label={closeLabels[data.locale]}
        onclick={() => drawer.close()}
      >
        <X size={22} />
      </button>
    </div>
    {@render navigation()}
  </dialog>
  <div class="admin-content">
    <header class="topbar">
      <button
        class="menu-button"
        type="button"
        aria-label={menuLabels[data.locale]}
        aria-haspopup="dialog"
        aria-controls="admin-navigation"
        onclick={() => drawer.showModal()}
      >
        <Menu size={23} />
      </button>
      <div class="topbar-account">
        <span class="account-mark" aria-hidden="true">
          {data.user.email.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <span class="account-email">{data.user.email}</span><span
            class="account-zone"
          >
            {preferences.effective}: {data.timeZone}
          </span>
        </div>
      </div>
      <form method="POST" action="/logout">
        <input type="hidden" name="csrfToken" value={data.csrfToken} /><button
          type="submit"
          class="signout"
        >
          {messages['admin.signOut']}
        </button>
      </form>
    </header>
    <main class="main-content">{@render children()}</main>
  </div>
</div>

<style>
  .admin-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    background: var(--ui-background);
    color: var(--ui-text);
  }
  .sidebar,
  .drawer {
    background: var(--brand-ink);
    color: var(--brand-on-ink);
  }
  .sidebar {
    padding: 28px 16px;
  }
  .brand-wrap {
    padding: 0 10px 35px;
  }
  .navigation {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .navigation a {
    display: flex;
    align-items: center;
    gap: 13px;
    min-height: 44px;
    padding: 10px 13px;
    border-radius: var(--ui-radius-sm);
    color: var(--brand-muted-on-ink);
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
  }
  .navigation a:hover,
  .navigation a.active {
    background: var(--brand-ink-panel);
    color: var(--brand-on-ink);
  }
  .navigation a.active {
    box-shadow: inset 3px 0 var(--brand-signal);
  }
  .navigation a.active :global(svg) {
    color: var(--brand-signal);
  }
  .navigation a:focus-visible,
  .drawer-close:focus-visible {
    outline: 3px solid var(--brand-focus-on-ink);
    outline-offset: 2px;
  }
  .admin-content {
    min-width: 0;
  }
  .topbar {
    min-height: 76px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 24px;
    padding: 14px 40px;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-surface);
  }
  .topbar-account {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .account-mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--ui-accent-surface);
    color: var(--ui-link);
    font-weight: 700;
  }
  .account-email,
  .account-zone {
    display: block;
    overflow-wrap: anywhere;
  }
  .account-email {
    font-size: 13px;
    font-weight: 650;
  }
  .account-zone {
    margin-top: 2px;
    color: var(--ui-text-muted);
    font-size: 11px;
  }
  .signout {
    color: var(--ui-text-muted);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .signout:hover {
    color: var(--ui-link);
    text-decoration: underline;
  }
  .main-content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 48px 40px 80px;
  }
  .menu-button {
    display: none;
  }
  .drawer {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(280px, 85vw);
    max-height: none;
    height: 100dvh;
    margin: 0;
    padding: 24px 16px;
    border: 0;
  }
  .drawer::backdrop {
    background: rgb(0 0 0 / 55%);
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 8px 32px;
  }
  .drawer-close {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    color: var(--brand-on-ink);
  }
  @media (max-width: 767px) {
    .admin-shell {
      display: block;
    }
    .sidebar {
      display: none;
    }
    .topbar {
      min-height: 68px;
      gap: 12px;
      padding: 12px 20px;
    }
    .menu-button {
      display: grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 44px;
      margin-right: auto;
      color: var(--ui-text);
    }
    .account-mark {
      display: none;
    }
    .main-content {
      padding: 32px 20px 60px;
    }
  }
</style>
